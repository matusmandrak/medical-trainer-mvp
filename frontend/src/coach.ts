import '../style.css'
import { t, getCurrentLanguage, translatorReady } from './translator'

// Translation update function
async function updateUIText() {
  // Wait for translator to be ready
  try {
    await translatorReady;
  } catch (error) {
    console.error('Failed to load translations:', error);
  }
  // Navigation
  const navScenarios = document.getElementById('nav-scenarios');
  const navDashboard = document.getElementById('nav-dashboard');
  const navLogout = document.getElementById('nav-logout');
  const navLanguage = document.getElementById('nav-language');

  if (navScenarios) navScenarios.textContent = t('nav.scenarios');
  if (navDashboard) navDashboard.textContent = t('nav.dashboard');
  if (navLogout) navLogout.textContent = t('nav.logout');
  if (navLanguage) navLanguage.textContent = t('nav.language');

  // Coach page content
  const coachTitle = document.getElementById('coach-title');
  const coachSubtitle = document.getElementById('coach-subtitle');
  const transcriptTitle = document.getElementById('transcript-title');
  const analysisTitle = document.getElementById('analysis-title');
  const askCoachTitle = document.getElementById('ask-coach-title');
  const askCoachSubtitle = document.getElementById('ask-coach-subtitle');
  const sendButton = document.getElementById('send-button');
  const recentConversationsTitle = document.getElementById('recent-conversations-title');
  const recentConversationsSubtitle = document.getElementById('recent-conversations-subtitle');
  const loadingText = document.getElementById('loading-text');
  const messageInput = document.getElementById('message-input') as HTMLInputElement;

  if (coachTitle) coachTitle.textContent = t('coach.title');
  if (coachSubtitle) coachSubtitle.textContent = t('coach.subtitle');
  if (transcriptTitle) transcriptTitle.textContent = t('coach.conversation_transcript');
  if (analysisTitle) analysisTitle.textContent = t('coach.ai_coach_analysis');
  if (askCoachTitle) askCoachTitle.textContent = t('coach.ask_coach');
  if (askCoachSubtitle) askCoachSubtitle.textContent = t('coach.ask_coach_subtitle');
  if (sendButton) sendButton.textContent = t('common.send');
  if (recentConversationsTitle) recentConversationsTitle.textContent = t('coach.recent_conversations');
  if (recentConversationsSubtitle) recentConversationsSubtitle.textContent = t('coach.recent_conversations_subtitle');
  if (loadingText) loadingText.textContent = t('common.loading');
  if (messageInput) messageInput.placeholder = t('coach.coach_placeholder');
}

// ---------------------- Coach Page Logic ----------------------
(function initCoach() {
  // Backend API base URL from env
  const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

  // Check authentication
  const token = localStorage.getItem('access_token')
  if (!token) {
    window.location.href = '/login'
    return
  }

  // Navigation elements
  const logoutButton = document.querySelector<HTMLButtonElement>('#logout-button')

  // Logout handler
  logoutButton?.addEventListener('click', () => {
    localStorage.removeItem('access_token')
    window.location.href = '/login'
  })

  // Mobile navigation functionality
  const mobileBtn = document.getElementById('nav-mobile-btn');
  const navMenu = document.getElementById('nav-menu');
  
  if (mobileBtn && navMenu) {
    mobileBtn.addEventListener('click', function() {
      mobileBtn.classList.toggle('active');
      navMenu.classList.toggle('active');
    });
    
    // Close menu when clicking on a link
    const navLinks = navMenu.querySelectorAll('.nav__link');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        mobileBtn.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
      if (!mobileBtn.contains(event.target as Node) && !navMenu.contains(event.target as Node)) {
        mobileBtn.classList.remove('active');
        navMenu.classList.remove('active');
      }
    });
  }

  // Get evaluation_id from URL (optional - might be selected from recent conversations)
  const urlParams = new URLSearchParams(window.location.search)
  let currentEvaluationId = urlParams.get('evaluation_id')

  // DOM elements
  const transcriptView = document.querySelector<HTMLDivElement>('#transcript-view')!
  const coachFeedbackDisplay = document.querySelector<HTMLDivElement>('#coach-feedback-display')!
  const chatWindow = document.querySelector<HTMLDivElement>('#chat-window')!
  const messageForm = document.querySelector<HTMLFormElement>('#message-form')!
  const messageInput = document.querySelector<HTMLInputElement>('#message-input')!
  const loadingModal = document.querySelector<HTMLDivElement>('#loading-modal')
  const recentConversationsList = document.querySelector<HTMLDivElement>('#recent-conversations-list')!

  // Chat history for Q&A with coach
  const chatHistory: string[] = []

  /**
   * Add a message to the coach chat window
   */
  function addMessageToChatWindow(sender: 'user' | 'assistant', text: string) {
    const msgDiv = document.createElement('div')
    msgDiv.classList.add(sender === 'user' ? 'user-message' : 'assistant-message')
    msgDiv.textContent = text
    chatWindow.appendChild(msgDiv)
    chatWindow.scrollTop = chatWindow.scrollHeight
  }

  /**
   * Show/hide loading modal
   */
  function showLoading(show: boolean) {
    if (loadingModal) {
      if (show) {
        loadingModal.classList.add('active')
      } else {
        loadingModal.classList.remove('active')
      }
    }
  }

  /**
   * Load and display recent conversations
   */
  async function loadRecentConversations() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/me/history?lang=${getCurrentLanguage()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const evaluations = await response.json()
      
      // Get the last 6 conversations
      const recentEvaluations = evaluations.slice(0, 6)

      if (recentConversationsList) {
        recentConversationsList.innerHTML = ''

        if (recentEvaluations.length === 0) {
          recentConversationsList.innerHTML = `<p class="text-center">${t('coach.no_conversations')}</p>`
          return
        }

        recentEvaluations.forEach((evaluation: any) => {
          const conversationCard = createConversationCard(evaluation)
          recentConversationsList.appendChild(conversationCard)
        })
      }
    } catch (error) {
      console.error('Error loading recent conversations:', error)
      if (recentConversationsList) {
        recentConversationsList.innerHTML = `<p class="error-message">${t('coach.failed_load_conversations')}</p>`
      }
    }
  }

  /**
   * Create a conversation card element
   */
  function createConversationCard(evaluation: any): HTMLElement {
    const card = document.createElement('div')
    card.className = 'conversation-card'
    
    // Get preview text from transcript
    const preview = evaluation.full_transcript
      .split('\n')
      .slice(0, 3)
      .join(' ')
      .substring(0, 150) + '...'

    const date = new Date(evaluation.created_at).toLocaleDateString()
    const messageCount = evaluation.full_transcript.split('\n').length

    card.innerHTML = `
      <div class="conversation-card-header">
        <div>
          <div class="conversation-scenario">Scenario ${evaluation.scenario_id}</div>
          <div class="conversation-date">${date}</div>
        </div>
      </div>
      <div class="conversation-stats">
        <div class="conversation-stat">
          <span>💬</span>
          <span>${messageCount} messages</span>
        </div>
        <div class="conversation-stat">
          <span>⭐</span>
          <span>Overall: ${evaluation.overall_score}/5</span>
        </div>
      </div>
      <div class="conversation-preview">${preview}</div>
      <div class="conversation-actions">
        <button class="conversation-btn conversation-btn-primary" onclick="loadConversation(${evaluation.id})">
          View Transcript
        </button>
        <button class="conversation-btn conversation-btn-secondary" onclick="getFeedbackForConversation(${evaluation.id})">
          Get AI Feedback
        </button>
      </div>
    `

    return card
  }

  /**
   * Load a specific conversation
   */
  window.loadConversation = function(evaluationId: number) {
    currentEvaluationId = evaluationId.toString()
    loadTranscript()
    
    // Scroll to transcript section
    document.querySelector('.coach-top-row')?.scrollIntoView({ behavior: 'smooth' })
  }

  /**
   * Get AI feedback for a specific conversation
   */
  window.getFeedbackForConversation = function(evaluationId: number) {
    currentEvaluationId = evaluationId.toString()
    loadTranscript()
    setTimeout(() => {
      generateFeedback()
    }, 500)
    
    // Scroll to transcript section
    document.querySelector('.coach-top-row')?.scrollIntoView({ behavior: 'smooth' })
  }

  /**
   * Fetch and display the conversation transcript
   */
  async function loadTranscript() {
    if (!currentEvaluationId) {
      if (transcriptView) {
        transcriptView.innerHTML = `<div class="transcript-header"><h3>${t('coach.no_conversation_selected')}</h3><p>${t('coach.select_conversation')}</p></div>`
      }
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/me/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const evaluations = await response.json()
      const evaluation = evaluations.find((ev: any) => ev.id === parseInt(currentEvaluationId!))

      if (!evaluation) {
        throw new Error('Evaluation not found')
      }

      // Display the transcript
      if (transcriptView) {
        const transcriptLines = evaluation.full_transcript.split('\n')
        const formattedTranscript = transcriptLines
          .map((line: string) => {
            if (line.startsWith('Doctor:')) {
              return `<div class="transcript-message doctor-message">${line}</div>`
            } else if (line.startsWith('Patient:')) {
              return `<div class="transcript-message patient-message">${line}</div>`
            } else {
              return `<div class="transcript-message">${line}</div>`
            }
          })
          .join('')

        transcriptView.innerHTML = `
          <div class="transcript-header">
            <h3>${t('coach.conversation_transcript')}</h3>
            <p>${t('coach.scenario_info', {scenario: evaluation.scenario_id})}</p>
            <p>${t('coach.created_at', {date: new Date(evaluation.created_at).toLocaleDateString()})}</p>
            <p>${t('coach.coach_score', {score: evaluation.overall_score})}</p>
          </div>
          <div class="transcript-messages">
            ${formattedTranscript}
          </div>
        `
      }

      // Reset feedback display
      if (coachFeedbackDisplay) {
        // Add "Get Professional Feedback" button if not already present
        if (!document.getElementById('get-feedback-button')) {
          const feedbackButton = document.createElement('button')
          feedbackButton.id = 'get-feedback-button'
          feedbackButton.textContent = t('coach.get_professional_feedback')
          feedbackButton.className = 'feedback-button primary'
          
          const buttonContainer = document.createElement('div')
          buttonContainer.className = 'feedback-button-container'
          buttonContainer.appendChild(feedbackButton)
          
          coachFeedbackDisplay.innerHTML = ''
          coachFeedbackDisplay.appendChild(buttonContainer)

          // Add event listener for feedback generation
          feedbackButton.addEventListener('click', generateFeedback)
        }
      }

    } catch (error) {
      console.error('Error loading transcript:', error)
      if (transcriptView) {
        transcriptView.innerHTML = `<p class="error-message">${t('coach.failed_load_transcript')}</p>`
      }
    }
  }

  /**
   * Generate comprehensive feedback from AI Coach
   */
  async function generateFeedback() {
    if (!currentEvaluationId) {
      alert(t('coach.select_conversation_first'))
      return
    }

    const feedbackButton = document.getElementById('get-feedback-button') as HTMLButtonElement
    
    if (feedbackButton) {
      feedbackButton.disabled = true
              feedbackButton.textContent = t('coach.generating_feedback')
    }

    showLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/coach/generate-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          evaluation_id: parseInt(currentEvaluationId!),
          lang: getCurrentLanguage()
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const feedbackText = data.feedback_text

      // Display the feedback (assuming it's in Markdown format)
      if (coachFeedbackDisplay) {
        // Remove the button container
        const buttonContainer = document.querySelector('.feedback-button-container')
        if (buttonContainer) {
          buttonContainer.remove()
        }

        // Convert basic markdown to HTML for display
        const htmlFeedback = feedbackText
          .replace(/### (.*)/g, '<h3>$1</h3>')
          .replace(/## (.*)/g, '<h2>$1</h2>')
          .replace(/# (.*)/g, '<h1>$1</h1>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br>')

        coachFeedbackDisplay.innerHTML = `
          <div class="coach-feedback">
            <p>${htmlFeedback}</p>
          </div>
        `
      }

    } catch (error) {
      console.error('Error generating feedback:', error)
      if (coachFeedbackDisplay) {
        coachFeedbackDisplay.innerHTML = `<p class="error-message">${t('coach.failed_generate_feedback')}</p>`
      }
    } finally {
      showLoading(false)
      if (feedbackButton) {
        feedbackButton.disabled = false
        feedbackButton.textContent = t('coach.get_professional_feedback')
      }
    }
  }

  /**
   * Handle coach chat form submission
   */
  messageForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    
    const userQuestion = messageInput.value.trim()
    if (!userQuestion) return

    // Add user message to chat
    addMessageToChatWindow('user', userQuestion)
    messageInput.value = ''

    try {
      const response = await fetch(`${API_BASE_URL}/api/coach/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: userQuestion,
          chat_history: chatHistory,
          lang: getCurrentLanguage()
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const coachResponse = data.response

      // Add coach response to chat
      if (coachResponse) {
        addMessageToChatWindow('assistant', coachResponse)
        
        // Update chat history
        chatHistory.push(userQuestion)
        chatHistory.push(coachResponse)
      }

    } catch (error) {
      console.error('Error chatting with coach:', error)
      addMessageToChatWindow('assistant', 'Sorry, I encountered an error. Please try again.')
    }
  })

  // Load recent conversations on page load
  loadRecentConversations()

  // If evaluation_id is provided in URL, load that transcript
  if (currentEvaluationId) {
    loadTranscript()
  }
})()

// Extend Window interface to include our global functions
declare global {
  interface Window {
    loadConversation: (evaluationId: number) => void;
    getFeedbackForConversation: (evaluationId: number) => void;
  }
}

// Initialize translations when DOM is loaded
document.addEventListener('DOMContentLoaded', updateUIText)