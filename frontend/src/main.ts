import '../style.css'

// Grab HTML elements
export const chatWindow = document.querySelector<HTMLDivElement>('#chat-window')!
export const messageForm = document.querySelector<HTMLFormElement>('#message-form')!
export const messageInput = document.querySelector<HTMLInputElement>('#message-input')!
export const evaluateButton = document.querySelector<HTMLButtonElement>('#evaluate-button')!
export const feedbackContainer = document.querySelector<HTMLDivElement>('#feedback-container')!

// Auth controls
const loginLink = document.querySelector<HTMLAnchorElement>('#login-link')
const logoutButton = document.querySelector<HTMLButtonElement>('#logout-button')
const dashboardLink = document.querySelector<HTMLAnchorElement>('#dashboard-link')

// On load, toggle auth controls based on token
const token = localStorage.getItem('access_token')
if (token) {
  logoutButton?.style.setProperty('display', 'inline-block')
  loginLink?.style.setProperty('display', 'none')
  dashboardLink?.style.setProperty('display', 'inline-block')
} else {
  loginLink?.style.setProperty('display', 'inline-block')
  logoutButton?.style.setProperty('display', 'none')
  dashboardLink?.style.setProperty('display', 'none')
}

// Logout handler
logoutButton?.addEventListener('click', () => {
  localStorage.removeItem('access_token')
  window.location.reload()
})

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
  const token = localStorage.getItem('access_token')
  
  if (conversationHistory.length === 0) {
    addMessageToChatWindow('assistant', 'Please have a conversation before requesting feedback.')
    return
  }

  evaluateButton.disabled = true
  const originalText = evaluateButton.textContent
  evaluateButton.textContent = 'Evaluating...'

  try {
    // Build transcript string with speaker prefixes
    const transcript = conversationHistory
      .map((msg, idx) => `${idx % 2 === 0 ? 'Doctor' : 'Patient'}: ${msg}`)
      .join('\n')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/evaluate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ transcript }),
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
  // 1. Clear any old results from the container and add a main title.
  feedbackContainer.innerHTML = '<h2>Evaluation Results</h2>';

  // 2. Safely get the justifications object. If it doesn't exist, create an empty one.
  const justifications = data.ai_justifications || {};

  // 3. Create a clean object of only the scores we want to display.
  const scoresToShow = {
    empathy_score: data.empathy_score,
    investigative_questioning_score: data.investigative_questioning_score,
    collaborative_problem_solving_score: data.collaborative_problem_solving_score
  };

  // 4. Loop through our scores object and build a card for each one.
  Object.entries(scoresToShow).forEach(([key, score]) => {
    // Don't create a card if a score is missing for some reason.
    if (score === undefined || score === null) return;

    const card = document.createElement('div');
    // Add the general card class and the specific score class (e.g., "score-3") for color-coding.
    card.className = `feedback-card score-${score}`;

    // Find the matching justification text for the current score's key.
    const justificationText = justifications[key] || 'No justification was provided.';
    
    // Create a nice, human-readable title from the key (e.g., "empathy_score" becomes "Empathy Score").
    const title = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Build the entire HTML for the card in one go. This is efficient.
    card.innerHTML = `
      <h4>${title}</h4>
      <div class="score-display">${score} / 5</div>
      <p class="justification-text">${justificationText}</p>
    `;

    // Add the completed card to our feedback container.
    feedbackContainer.appendChild(card);
  });

  // 5. Finally, make the whole container visible on the page.
  feedbackContainer.style.display = 'block';
}

// Attach listener
evaluateButton.addEventListener('click', handleEvaluation)

