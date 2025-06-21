import '../style.css'

// Grab HTML elements
export const chatWindow = document.querySelector<HTMLDivElement>('#chat-window')!
export const messageForm = document.querySelector<HTMLFormElement>('#message-form')!
export const messageInput = document.querySelector<HTMLInputElement>('#message-input')!
export const evaluateButton = document.querySelector<HTMLButtonElement>('#evaluate-button')!
export const feedbackContainer = document.querySelector<HTMLDivElement>('#feedback-container')!

// Conversation history
export const conversationHistory: string[] = []

/**
 * Append a user or assistant message to the chat window and keep the latest
 * message in view.
 */
export function addMessageToChatWindow(sender: 'user' | 'assistant', text: string) {
  const msgDiv = document.createElement('div')
  msgDiv.classList.add(sender === 'user' ? 'user-message' : 'assistant-message')
  msgDiv.textContent = text

  chatWindow.appendChild(msgDiv)

  // Auto-scroll to the bottom
  chatWindow.scrollTop = chatWindow.scrollHeight
}

// Backend API base URL from env
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

// For now, log to verify setup in dev mode
if (import.meta.env.DEV) {
  console.log('API_BASE_URL', API_BASE_URL)
}

// Handle message form submission
messageForm.addEventListener('submit', async (event) => {
  event.preventDefault()

  const userText = messageInput.value.trim()
  if (!userText) return // Ignore empty submissions

  // Immediately display user message
  addMessageToChatWindow('user', userText)

  // We add the user's message to the history *before* sending
  const currentHistory = [...conversationHistory, userText]

  // Clear input for a responsive feel
  messageInput.value = ''

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // --- FIX #1: Send the correct JSON structure ---
      body: JSON.stringify({
        history: conversationHistory, // The history *before* the user's latest message
        message: userText           // The new message itself
      }),
    })

    if (!response.ok) {
        // If the server response is not OK, we throw an error to be caught by the catch block
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    // --- FIX #2: Look for the correct 'response' key ---
    const assistantText = data.response ?? ''

    if (assistantText) {
      addMessageToChatWindow('assistant', assistantText)
      // Now we update the history with both messages for the next turn
      conversationHistory.push(userText, assistantText)
    }
  } catch (error) {
    console.error('Error fetching assistant response:', error)
    addMessageToChatWindow('assistant', 'Sorry, something went wrong. Please try again later.')
    // Note: We don't add the user's message to history if the API call fails
    // to prevent a broken conversation history. The user can just try sending again.
  }
})

// ---------------------- Evaluation Flow ----------------------

async function handleEvaluation() {
  if (conversationHistory.length === 0) {
    addMessageToChatWindow('assistant', 'Please have a conversation before requesting feedback.')
    return
  }

  evaluateButton.disabled = true
  const originalText = evaluateButton.textContent
  evaluateButton.textContent = 'Evaluating...'

  try {
    const response = await fetch(`${API_BASE_URL}/api/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript: conversationHistory }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const evaluationData: Record<string, any> = await response.json()
    displayEvaluationResults(evaluationData)
  } catch (error) {
    console.error('Evaluation error:', error)
    addMessageToChatWindow('assistant', 'Failed to fetch evaluation. Please try again later.')
  } finally {
    evaluateButton.disabled = false
    evaluateButton.textContent = originalText ?? 'Finish & Get Feedback'
  }
}

function displayEvaluationResults(data: Record<string, any>) {
  // Reset feedback container
  feedbackContainer.innerHTML = ''

  // Heading
  const heading = document.createElement('h2')
  heading.textContent = 'Evaluation Results'
  feedbackContainer.appendChild(heading)

  // If data has nested scores, iterate accordingly
  Object.entries(data).forEach(([criterion, value]) => {
    let score: number | string | undefined
    let justification: string | undefined

    if (value && typeof value === 'object') {
      if ('score' in value) score = (value as any).score
      if ('justification' in value) justification = (value as any).justification
    } else {
      score = value as any
    }

    // Create feedback card
    const card = document.createElement('div')
    card.classList.add('feedback-card')
    if (score !== undefined && score !== null) {
      card.classList.add(`score-${score}`)
    }

    // Criterion heading
    const critHeading = document.createElement('h4')
    critHeading.textContent = criterion.replace(/([A-Z])/g, ' $1').trim()
    card.appendChild(critHeading)

    // Score display
    if (score !== undefined) {
      const scoreDiv = document.createElement('div')
      scoreDiv.classList.add('score-display')
      scoreDiv.textContent = typeof score === 'number' ? `${score} / 5` : String(score)
      card.appendChild(scoreDiv)
    }

    // Justification paragraph
    if (justification) {
      const p = document.createElement('p')
      p.classList.add('justification-text')
      p.textContent = justification
      card.appendChild(p)
    }

    feedbackContainer.appendChild(card)
  })

  // Make container visible
  feedbackContainer.style.display = 'block'
}

// Attach listener
evaluateButton.addEventListener('click', handleEvaluation)

