import '../style.css'
import { t, getCurrentLanguage, translatorReady } from './translator'

// Translation update function for trainer page
async function updateTrainerUIText() {
  // Wait for translator to be ready
  try {
    await translatorReady;
  } catch (error) {
    console.error('Failed to load translations:', error);
  }

  // Navigation
  const navDashboard = document.getElementById('nav-dashboard');
  const navScenarios = document.getElementById('nav-scenarios');
  const navCoach = document.getElementById('nav-coach');
  const navLogout = document.getElementById('nav-logout');
  const navLanguage = document.getElementById('nav-language');

  if (navDashboard) navDashboard.textContent = t('nav.dashboard');
  if (navScenarios) navScenarios.textContent = t('nav.scenarios');
  if (navCoach) navCoach.textContent = t('nav.ai_coach');
  if (navLogout) navLogout.textContent = t('nav.logout');
  if (navLanguage) navLanguage.textContent = t('nav.language');

  // Trainer content
  const startScenarioButton = document.getElementById('start-scenario-button');
  const sendButton = document.getElementById('send-button');
  const evaluateButton = document.getElementById('evaluate-button');
  const messageInput = document.getElementById('message-input') as HTMLInputElement;
  const askCoachHintButton = document.getElementById('ask-coach-hint-button');

  if (startScenarioButton) startScenarioButton.textContent = t('trainer.start_scenario');
  if (sendButton) sendButton.textContent = t('trainer.send');
  if (evaluateButton) evaluateButton.textContent = t('trainer.finish_feedback');
  if (messageInput) messageInput.placeholder = t('trainer.type_message');
  if (askCoachHintButton) askCoachHintButton.textContent = t('trainer.ask_coach_hint');
}

if (document.querySelector<HTMLDivElement>('#chat-window')) {
  // ---------------------- Trainer Page Logic ----------------------
  (function initTrainer() {
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
        const res = await fetch(`${API_BASE_URL}/api/scenarios/${encodeURIComponent(scenarioId!)}?lang=${getCurrentLanguage()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const scenario = (await res.json()) as Record<string, any>
        console.log('Loaded scenario details:', scenario)

        const descContainer = document.querySelector<HTMLDivElement>('.scenario-description')
        if (descContainer) {
          descContainer.innerHTML = `
            <h3>${scenario.title ?? 'Scenario'}</h3>
            <p><strong>Overview:</strong> ${scenario.goal ?? 'No goal defined.'}</p>
            <p><strong>Learning Path:</strong> ${scenario.learning_path ?? 'N/A'}</p>
            <p><strong>Difficulty:</strong> ${scenario.difficulty ?? 'N/A'}</p>
          `
        }
      
        // Display skills from the skills array
        const skillsContainer = document.querySelector<HTMLDivElement>('.skills-to-practice')
        const skills = scenario.skills as string[] | undefined

        if (skillsContainer && skills && skills.length > 0) {
          const skillsList = skills
            .map((skill) => `<li>${skill}</li>`)
            .join('')
          skillsContainer.innerHTML = `<h4>${t('trainer.skills_to_practice')}</h4><ul>${skillsList}</ul>`
        } else if (skillsContainer) {
          skillsContainer.innerHTML = `<h4>${t('trainer.skills_to_practice')}</h4><p>No specific skills defined.</p>`
        }

        // Store the opening line and voice_id for later use when scenario starts
        savedOpeningLine = scenario.opening_line
        savedVoiceId = scenario.voice_id
        
        // Set the emotional state from scenario data
        currentEmotionalState = scenario.initial_emotional_state || 'Neutral'
        
        // Set the message limit from scenario data and update counter display
        messagesRemaining = scenario.message_limit || 20
        updateCounterUI()
      } catch (err) {
        console.error('Failed to load scenario details:', err)
        
        // Show error in the scenario description area
        const descContainer = document.querySelector<HTMLDivElement>('.scenario-description')
        if (descContainer) {
          descContainer.innerHTML = `
            <h3>Error Loading Scenario</h3>
            <p>Unable to load scenario details. Please check your connection and try again.</p>
            <button onclick="window.location.reload()" class="button-secondary">Reload Page</button>
          `
        }
      }
    }

    // Grab HTML elements
    const chatWindow = document.querySelector<HTMLDivElement>('#chat-window')!
    const messageForm = document.querySelector<HTMLFormElement>('#message-form')!
    const messageInput = document.querySelector<HTMLInputElement>('#message-input')!
    const micButton = document.querySelector<HTMLButtonElement>('#mic-button')!
    const evaluateButton = document.querySelector<HTMLButtonElement>('#evaluate-button')!
    const feedbackContainer = document.querySelector<HTMLDivElement>('#feedback-container')!
    const startScenarioButton = document.querySelector<HTMLButtonElement>('#start-scenario-button')!
    const appMainContent = document.querySelector<HTMLElement>('.app-main-content')!
    const messageCounter = document.querySelector<HTMLDivElement>('#message-counter')!
    const hintButton = document.querySelector<HTMLButtonElement>('#ask-coach-hint-button')!
    const hintDisplay = document.querySelector<HTMLDivElement>('#hint-display')!

    // Message counter variables
    let messagesRemaining: number = 20

    // Emotional state tracking
    let currentEmotionalState: string = 'Neutral'

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
    
    // Store opening line and voice_id for later use
    let savedOpeningLine: string | undefined
    let savedVoiceId: string | undefined

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

    /**
     * Play audio from base64 encoded data
     */
    async function playAudioFromBase64(audioData: string) {
      try {
        // Decode base64 to binary data
        const binaryString = atob(audioData)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        // Create blob and audio element
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' })
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        
        // Play the audio
        await audio.play()
        
        // Clean up the object URL after playing
        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(audioUrl)
        })
      } catch (audioErr) {
        console.error('Error playing audio:', audioErr)
      }
    }

    /**
     * Update the message counter UI display
     */
    function updateCounterUI() {
      const counterElement = document.querySelector<HTMLDivElement>('#message-counter')
      if (counterElement) {
        counterElement.textContent = t('trainer.messages_remaining', { count: messagesRemaining })
      }
    }

    /**
     * Hide the hint display
     */
    function hideHint() {
      if (hintDisplay) {
        hintDisplay.style.display = 'none'
        hintDisplay.innerHTML = ''
      }
    }

    /**
     * Show loading state for hint
     */
    function showHintLoading() {
      if (hintDisplay) {
        hintDisplay.style.display = 'block'
        hintDisplay.className = 'hint-display loading'
        hintDisplay.innerHTML = `<p>${t('trainer.getting_hint')}</p>`
      }
    }

    /**
     * Display hint content
     */
    function showHint(hintText: string) {
      if (hintDisplay) {
        hintDisplay.style.display = 'block'
        hintDisplay.className = 'hint-display'
        hintDisplay.innerHTML = `<p>${hintText}</p>`
      }
    }

    /**
     * Fetch hint from coach API
     */
    async function getHintFromCoach() {
      try {
        showHintLoading()
        
        // Prepare conversation history as array of strings (not joined string)
        const conversationForHint = conversationHistory.map((item) => item.content)
        
        const response = await fetch(`${API_BASE_URL}/api/coach/hint`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            scenario_id: scenarioId, // Keep as string, don't convert to int
            conversation_history: conversationForHint, // Send as array of strings
            lang: getCurrentLanguage()
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        showHint(data.hint || t('trainer.no_hint_available'))
        
      } catch (err) {
        console.error('Error getting hint:', err)
        showHint(t('trainer.hint_error'))
      }
    }

    // For now, log to verify setup in dev mode
    if (import.meta.env.DEV) {
      console.log('API_BASE_URL', API_BASE_URL)
    }

    // Voice recording variables
    let mediaRecorder: MediaRecorder | null = null
    let audioChunks: Blob[] = []
    let isRecording = false

    // ---- Hint Button Logic ----
    hintButton.addEventListener('click', async () => {
      await getHintFromCoach()
    })

    // ---- Voice Recording Logic ----
    micButton.addEventListener('click', async () => {
      if (!isRecording) {
        // Start recording
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          mediaRecorder = new MediaRecorder(stream)
          audioChunks = []
          
          // Handle data collection
          mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data.size > 0) {
              audioChunks.push(event.data)
            }
          })
          
          // Handle recording stop
          mediaRecorder.addEventListener('stop', async () => {
            // Stop all tracks to release microphone
            stream.getTracks().forEach(track => track.stop())
            
            // Create audio blob from chunks
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
            
            // Send to transcription API
            await transcribeAudio(audioBlob)
          })
          
          // Start recording
          mediaRecorder.start()
          isRecording = true
          micButton.classList.add('is-recording')
          
        } catch (err) {
          console.error('Error accessing microphone:', err)
          addMessageToChatWindow('assistant', 'Unable to access microphone. Please check your permissions.')
        }
      } else {
        // Stop recording
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
          isRecording = false
          micButton.classList.remove('is-recording')
        }
      }
    })

    async function transcribeAudio(audioBlob: Blob) {
      try {
        // Create FormData and append audio file
        const formData = new FormData()
        formData.append('audio_file', audioBlob, 'recording.wav')
        
        // Send to transcription endpoint
        const response = await fetch(`${API_BASE_URL}/api/transcribe?lang=${getCurrentLanguage()}`, {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const data = await response.json()
        const transcript = data.transcript || ''
        
        // Set the transcribed text in the message input
        if (transcript.trim()) {
          messageInput.value = transcript.trim()
          messageInput.focus()
        } else {
          addMessageToChatWindow('assistant', 'No speech detected. Please try speaking more clearly.')
        }
        
      } catch (err) {
        console.error('Transcription error:', err)
        addMessageToChatWindow('assistant', 'Failed to transcribe audio. Please try again.')
      }
    }

    // ---- Message form submission ----
    messageForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      const userText = messageInput.value.trim()
      if (!userText) return
      
      // Hide any displayed hints when user sends a message
      hideHint()
      
      addMessageToChatWindow('user', userText)
      messageInput.value = ''

      const historyForAPI = conversationHistory.map((item) => item.content)
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            scenario_id: scenarioId, 
            history: historyForAPI, 
            message: userText,
            current_emotional_state: currentEmotionalState,
            lang: getCurrentLanguage()
          }),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        const assistantText = data.text_response ?? ''
        const audioData = data.audio_response_base64
        
        // Update emotional state if provided in response
        if (data.new_emotional_state) {
          currentEmotionalState = data.new_emotional_state
        }

        if (assistantText) {
          addMessageToChatWindow('assistant', assistantText)
          conversationHistory.push({ role: 'user', content: userText })
          conversationHistory.push({ role: 'assistant', content: assistantText })
          
          // Decrement message counter and update display
          messagesRemaining -= 1
          updateCounterUI()
          
          // Check if messages are exhausted
          if (messagesRemaining <= 0) {
            messageInput.disabled = true
            messageForm.querySelector('button[type="submit"]')?.setAttribute('disabled', 'true')
            setTimeout(() => handleEvaluation(), 1000) // Small delay before auto-evaluation
          }
        }

        // Play audio if available
        if (audioData) {
          await playAudioFromBase64(audioData)
        }
      } catch (err) {
        console.error('Chat error:', err)
        addMessageToChatWindow('assistant', 'Sorry, something went wrong. Please try again later.')
      }
    })

    // ---- Start Scenario Logic ----
    startScenarioButton.addEventListener('click', async () => {
      // Hide the start scenario button
      startScenarioButton.style.display = 'none'
      
      // Show the chat header
      const chatHeader = document.getElementById('chat-header')
      if (chatHeader) {
        chatHeader.style.display = 'block'
      }
      
      // Show the chat interface by adding active class
      appMainContent.classList.add('active')
      
      // Display the opening line if available
      if (savedOpeningLine) {
        addMessageToChatWindow('assistant', savedOpeningLine)
        conversationHistory.push({ role: 'assistant', content: savedOpeningLine })
        
        // Generate and play audio for the opening line
        try {
          const ttsResponse = await fetch(`${API_BASE_URL}/api/text-to-speech`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: savedOpeningLine, voice_id: savedVoiceId, lang: getCurrentLanguage() })
          })
          
          if (ttsResponse.ok) {
            const ttsData = await ttsResponse.json()
            const audioData = ttsData.audio_response_base64
            
            if (audioData) {
              await playAudioFromBase64(audioData)
            }
          } else {
            console.error('Failed to generate opening line audio:', ttsResponse.status)
          }
        } catch (ttsErr) {
          console.error('Error generating opening line audio:', ttsErr)
        }
      } else {
        // If no opening line, show a generic message
        addMessageToChatWindow('assistant', 'Hello! I\'m ready to begin our conversation. How can I help you today?')
        conversationHistory.push({ role: 'assistant', content: 'Hello! I\'m ready to begin our conversation. How can I help you today?' })
      }
    })

    // Store evaluation ID for coach feedback
    let currentEvaluationId: number | null = null

    // ---- Evaluation flow ----
    async function handleEvaluation() {
      if (conversationHistory.length === 0) {
        addMessageToChatWindow('assistant', 'Please have a conversation before requesting feedback.')
        return
      }
      
      if (!scenarioId) {
        addMessageToChatWindow('assistant', 'Scenario ID is missing. Please reload the page.')
        return
      }
      
      evaluateButton.disabled = true
      const originalText = evaluateButton.textContent
      evaluateButton.textContent = t('trainer.evaluating')
      
      try {
        const transcript = conversationHistory
          .map(({ role, content }) => `${role === 'user' ? 'Doctor' : 'Patient'}: ${content}`)
          .join('\n')
        
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`
        
        const res = await fetch(`${API_BASE_URL}/api/evaluate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            transcript, 
            scenario_id: scenarioId, 
            lang: getCurrentLanguage() 
          }),
        })
        
        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(`HTTP ${res.status}: ${errorText}`)
        }
        
        const evaluationData = await res.json()
        
        // Store evaluation_id if it exists in the response
        if (evaluationData.evaluation_id) {
          currentEvaluationId = evaluationData.evaluation_id
        }
        
        displayEvaluationResults(evaluationData)
      } catch (err) {
        console.error('Evaluation error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        addMessageToChatWindow('assistant', `Failed to fetch evaluation: ${errorMessage}`)
      } finally {
        evaluateButton.disabled = false
        evaluateButton.textContent = originalText ?? 'Finish & Get Feedback'
      }
    }

    function displayEvaluationResults(data: Record<string, any>) {
      // Clear previous results and populate the modal's feedback container
      feedbackContainer.innerHTML = ''
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
      
      // Add AI Coach button if evaluation_id is available
      if (currentEvaluationId && token) {
        const coachButton = document.createElement('button')
        coachButton.id = 'ask-coach-button'
        coachButton.textContent = t('trainer.get_deeper_feedback')
        coachButton.className = 'coach-feedback-button'
        feedbackContainer.appendChild(coachButton)
        
        // Add event listener for coach button
        coachButton.addEventListener('click', () => {
          window.location.href = `/coach?evaluation_id=${currentEvaluationId}`
        })
      }
      
      // Show the evaluation modal
      const evaluationModal = document.getElementById('evaluation-modal')
      if (evaluationModal) {
        evaluationModal.classList.add('active')
      }
    }

    evaluateButton.addEventListener('click', handleEvaluation)

    loadScenarioDetails()
  })()
}

// Initialize translations when DOM is loaded
document.addEventListener('DOMContentLoaded', updateTrainerUIText)
