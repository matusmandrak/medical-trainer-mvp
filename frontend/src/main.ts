import '../style.css'

// ---------------------- Scenario Handling ----------------------

// Parse scenario ID from URL
const urlParams = new URLSearchParams(window.location.search)
const scenarioId = urlParams.get('scenario')

if (!scenarioId) {
  window.location.href = '/scenarios'
  throw new Error('No scenario specified; redirecting to scenarios list')
}

// Fetch scenario details and populate sidebar
async function loadScenarioDetails() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/scenarios/${encodeURIComponent(scenarioId!)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const scenario = await res.json() as Record<string, any>

    const descContainer = document.querySelector<HTMLDivElement>('.scenario-description')
    if (descContainer) {
      descContainer.innerHTML = `
        <h3>${scenario.title ?? 'Scenario'}</h3>
        <p><strong>Goal:</strong> ${scenario.goal ?? 'No goal defined.'}</p>
        <p><strong>Learning Path:</strong> ${scenario.learning_path ?? 'N/A'}</p>
        <p><strong>Difficulty:</strong> ${scenario.difficulty ?? 'N/A'}</p>
      `
    }

    // Display the patient's opening line and seed conversation history
    const openingLine: string | undefined = scenario.opening_line
    if (openingLine) {
      addMessageToChatWindow('assistant', openingLine)
      conversationHistory.push({ role: 'assistant', content: openingLine })
    }
  } catch (err) {
    console.error('Failed to load scenario details:', err)
  }
}

// Grab HTML elements
export const chatWindow = document.querySelector<HTMLDivElement>('#chat-window')!
export const messageForm = document.querySelector<HTMLFormElement>('#message-form')!
export const messageInput = document.querySelector<HTMLInputElement>('#message-input')!
export const evaluateButton = document.querySelector<HTMLButtonElement>('#evaluate-button')!
export const feedbackContainer = document.querySelector<HTMLDivElement>('#feedback-container')!

// Auth controls
const loginLink = document.querySelector<HTMLAnchorElement>('#login-link')
const signupLink = document.querySelector<HTMLAnchorElement>('#signup-link')
const logoutButton = document.querySelector<HTMLButtonElement>('#logout-button')
const dashboardLink = document.querySelector<HTMLAnchorElement>('#dashboard-link')

// On load, toggle auth controls based on token
const token = localStorage.getItem('access_token')
if (token) {
  // User is logged in: show logout & dashboard, hide login and signup links
  logoutButton?.style.setProperty('display', 'inline-block')
  dashboardLink?.style.setProperty('display', 'inline-block')

  loginLink?.style.setProperty('display', 'none')
  signupLink?.style.setProperty('display', 'none')
} else {
  // User is logged out: show login & signup links, hide logout & dashboard
  loginLink?.style.setProperty('display', 'inline-block')
  signupLink?.style.setProperty('display', 'inline-block')

  logoutButton?.style.setProperty('display', 'none')
  dashboardLink?.style.setProperty('display', 'none')
}

// Logout handler
logoutButton?.addEventListener('click', () => {
  localStorage.removeItem('access_token')
  window.location.reload()
})

// Conversation history
export const conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []

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
  event.preventDefault();

  const userText = messageInput.value.trim();
  if (!userText) return; // Ignore empty submissions

  // 1. Display user message immediately for a responsive feel
  addMessageToChatWindow('user', userText);
  messageInput.value = ''; // Clear the input right away

  try {
    // 2. Prepare the data for the API. Note that we send the history as it was *before* this new message.
    const historyForAPI = conversationHistory.map(item => item.content);

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scenario_id: scenarioId,
        history: historyForAPI, // Send the old history
        message: userText,      // Send the new message separately
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const assistantText = data.response ?? '';

    if (assistantText) {
      // 3. Display the AI's response
      addMessageToChatWindow('assistant', assistantText);
      
      // 4. NOW, after a successful round-trip, add BOTH messages to the history
      conversationHistory.push({ role: 'user', content: userText });
      conversationHistory.push({ role: 'assistant', content: assistantText });
    }
  } catch (error) {
    console.error('Error fetching assistant response:', error);
    addMessageToChatWindow('assistant', 'Sorry, something went wrong. Please try again later.');
    // We correctly do NOT add the user's message to history if the API call fails.
  }
});

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
      .map(({ role, content }) => `${role === 'user' ? 'Doctor' : 'Patient'}: ${content}`)
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
      body: JSON.stringify({ transcript: transcript, scenario_id: scenarioId }),
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

  // 2. Loop through the data object directly. The key will be the skill name.
  Object.entries(data).forEach(([skillName, details]) => {
    
    // 3. Check if the 'details' object is valid and has what we need.
    if (typeof details !== 'object' || !('score' in details) || !('justification' in details)) {
      return; // Skip this entry if the format is wrong
    }
    
    const score = details.score;
    const justificationText = details.justification;

    // 4. Create the card and add the correct classes.
    const card = document.createElement('div');
    card.className = `feedback-card score-${score}`;

    // 5. Build the card's HTML in one go with the correct data.
    card.innerHTML = `
      <h4>${skillName}</h4>
      <div class="score-display">${score} / 5</div>
      <p class="justification-text">${justificationText}</p>
    `;
    
    // 6. Add the completed card to the page.
    feedbackContainer.appendChild(card);
  });

  // 7. Finally, make the whole container visible.
  feedbackContainer.style.display = 'block';
}

// Attach listener
evaluateButton.addEventListener('click', handleEvaluation)

loadScenarioDetails()
