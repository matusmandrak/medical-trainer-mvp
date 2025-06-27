import '../style.css'

if (document.querySelector<HTMLDivElement>('#chat-window')) {
  // ---------------------- Trainer Page Logic ----------------------
  (function initTrainer() {
    const body = document.body;
    const sidebarToggle = document.getElementById('sidebar-toggle');

    sidebarToggle?.addEventListener('click', () => {
      body.classList.toggle('sidebar-collapsed');
    });
    // ---------------------- Scenario Handling ----------------------
    // Parse scenario ID from URL
    const urlParams = new URLSearchParams(window.location.search)
    const scenarioId = urlParams.get('scenario')

    if (!scenarioId) {
      window.location.href = '/scenarios'
      return
    }

    // Backend API base URL from env
    const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

    // Fetch scenario details and populate sidebar
    async function loadScenarioDetails() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/scenarios/${encodeURIComponent(scenarioId!)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const scenario = (await res.json()) as Record<string, any>

        const descContainer = document.querySelector<HTMLDivElement>('.scenario-description')
        if (descContainer) {
          descContainer.innerHTML = `
            <h3>${scenario.title ?? 'Scenario'}</h3>
            <p><strong>Goal:</strong> ${scenario.goal ?? 'No goal defined.'}</p>
            <p><strong>Learning Path:</strong> ${scenario.learning_path ?? 'N/A'}</p>
            <p><strong>Difficulty:</strong> ${scenario.difficulty ?? 'N/A'}</p>
          `;

          // --- THIS IS THE NEW CODE YOU ADD ---
          const patientNameHeader = document.getElementById('patient-name-header');
          if (patientNameHeader && scenario.persona_name) {
            patientNameHeader.textContent = `Conversation with ${scenario.persona_name}`;
          }
          // --- END OF NEW CODE ---
        }

        
      
        // --- New block to display skills ---
        const skillsContainer = document.querySelector<HTMLDivElement>('.skills-to-practice')
        const rubric = scenario.rubric as Record<string, string> | undefined

        if (skillsContainer && rubric) {
          const skillsList = Object.keys(rubric)
            .map((skill) => `<li>${skill}</li>`)
            .join('')
          skillsContainer.innerHTML = `<h4>Skills to Practice:</h4><ul>${skillsList}</ul>`
        }
        // --- End of new block ---

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
    const chatWindow = document.querySelector<HTMLDivElement>('#chat-window')!
    const messageForm = document.querySelector<HTMLFormElement>('#message-form')!
    const messageInput = document.querySelector<HTMLInputElement>('#message-input')!
    const evaluateButton = document.querySelector<HTMLButtonElement>('#evaluate-button')!
    const feedbackContainer = document.querySelector<HTMLDivElement>('#feedback-container')!

    // Auth controls
    const loginLink = document.querySelector<HTMLAnchorElement>('#login-link')
    const signupLink = document.querySelector<HTMLAnchorElement>('#signup-link')
    const logoutButton = document.querySelector<HTMLButtonElement>('#logout-button')
    const dashboardLink = document.querySelector<HTMLAnchorElement>('#dashboard-link')

    // On load, toggle auth controls based on token
    const token = localStorage.getItem('access_token')
    if (token) {
      logoutButton?.style.setProperty('display', 'inline-block')
      dashboardLink?.style.setProperty('display', 'inline-block')
      loginLink?.style.setProperty('display', 'none')
      signupLink?.style.setProperty('display', 'none')
    } else {
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
    const conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []

    /**
     * Append a message to chat window
     */
    function addMessageToChatWindow(sender: 'user' | 'assistant', text: string) {
      const msgDiv = document.createElement('div')
      msgDiv.classList.add(sender === 'user' ? 'user-message' : 'assistant-message')
      msgDiv.textContent = text
      chatWindow.appendChild(msgDiv)
      chatWindow.scrollTop = chatWindow.scrollHeight
    }

    // For now, log to verify setup in dev mode
    if (import.meta.env.DEV) {
      console.log('API_BASE_URL', API_BASE_URL)
    }

    // ---- Message form submission ----
    messageForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      const userText = messageInput.value.trim()
      if (!userText) return
      addMessageToChatWindow('user', userText)
      messageInput.value = ''

      const historyForAPI = conversationHistory.map((item) => item.content)
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario_id: scenarioId, history: historyForAPI, message: userText }),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        const assistantText = data.response ?? ''
        if (assistantText) {
          addMessageToChatWindow('assistant', assistantText)
          conversationHistory.push({ role: 'user', content: userText })
          conversationHistory.push({ role: 'assistant', content: assistantText })
        }
      } catch (err) {
        console.error('Chat error:', err)
        addMessageToChatWindow('assistant', 'Sorry, something went wrong. Please try again later.')
      }
    })

    // ---- Evaluation flow ----
    async function handleEvaluation() {
      if (conversationHistory.length === 0) {
        addMessageToChatWindow('assistant', 'Please have a conversation before requesting feedback.')
        return
      }
      evaluateButton.disabled = true
      const originalText = evaluateButton.textContent
      evaluateButton.textContent = 'Evaluating...'
      try {
        const transcript = conversationHistory
          .map(({ role, content }) => `${role === 'user' ? 'Doctor' : 'Patient'}: ${content}`)
          .join('\n')
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(`${API_BASE_URL}/api/evaluate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ transcript, scenario_id: scenarioId }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const evaluationData = await res.json()
        displayEvaluationResults(evaluationData)
      } catch (err) {
        console.error('Evaluation error:', err)
        addMessageToChatWindow('assistant', 'Failed to fetch evaluation.')
      } finally {
        evaluateButton.disabled = false
        evaluateButton.textContent = originalText ?? 'Finish & Get Feedback'
      }
    }

    function displayEvaluationResults(data: Record<string, any>) {
      feedbackContainer.innerHTML = '<h2>Evaluation Results</h2>'
      Object.entries(data).forEach(([skill, details]) => {
        if (typeof details !== 'object' || !('score' in details) || !('justification' in details)) return
        const card = document.createElement('div')
        card.className = `feedback-card score-${details.score}`
        card.innerHTML = `
          <div class="feedback-card__header">
            <h4>${skill}</h4>
            <span class="score-display">${details.score} / 5</span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar__fill" style="width: ${details.score * 20}%"></div>
          </div>
          <p class="justification-text">${details.justification}</p>
        `
        feedbackContainer.appendChild(card)
      })
      feedbackContainer.style.display = 'block'
    }

    evaluateButton.addEventListener('click', handleEvaluation)
    loadScenarioDetails()
  })()
}
