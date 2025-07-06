import '../style.css'
import { t, getCurrentLanguage, translatorReady } from './translator'

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

// Define the structure of a scenario object
interface Scenario {
  id: string
  title: string
  learning_path: string
  difficulty: 'Medium' | 'Hard'
  description: string
}

// Find the container element on the page
const listContainer = document.getElementById('scenario-list') as HTMLElement | null

// Translation update function
async function updateUIText() {
  // Wait for translator to be ready
  try {
    await translatorReady;
  } catch (error) {
    console.error('Failed to load translations:', error);
  }

  // Navigation
  const navDashboard = document.getElementById('nav-dashboard');
  const navLogout = document.getElementById('nav-logout');
  const navLanguage = document.getElementById('nav-language');

  if (navDashboard) navDashboard.textContent = t('nav.dashboard');
  if (navLogout) navLogout.textContent = t('nav.logout');
  if (navLanguage) navLanguage.textContent = t('nav.language');

  // Scenarios page content
  const scenariosTitle = document.getElementById('scenarios-title');
  const scenariosSubtitle = document.getElementById('scenarios-subtitle');

  if (scenariosTitle) scenariosTitle.textContent = t('scenarios.title');
  if (scenariosSubtitle) scenariosSubtitle.textContent = t('scenarios.subtitle');
}

// Function to load and display the scenarios
async function loadScenarios() {
  if (!listContainer) {
    console.error('#scenario-list element not found')
    return
  }

  let scenariosData: Scenario[] = []
  
  try {
    // Fetch from API with language parameter - no fallback to static data
    const response = await fetch(`${API_BASE_URL}/api/scenarios?lang=${getCurrentLanguage()}`)
    if (response.ok) {
      scenariosData = await response.json()
      console.log('Scenarios loaded from API:', scenariosData)
    } else {
      throw new Error(`API request failed with status ${response.status}`)
    }
  } catch (error) {
    console.error('Failed to load scenarios from API:', error)
    listContainer.innerHTML = `<div class="error-message">
      <h3>Failed to load scenarios</h3>
      <p>Unable to connect to the server. Please try again later.</p>
      <button onclick="window.location.reload()" class="button-primary">Retry</button>
    </div>`
    return
  }

  if (!scenariosData.length) {
    listContainer.innerHTML = `<div class="no-scenarios-message">
      <h3>${t('scenarios.no_scenarios')}</h3>
    </div>`
    return
  }

  // Clear any existing content
  listContainer.innerHTML = ''

  // Loop through our data and create a card for each scenario
  scenariosData.forEach((scenario: Scenario) => {
    const cardLink = document.createElement('a')
    cardLink.href = `/trainer?scenario=${scenario.id}`
    cardLink.className = 'scenario-card'
    cardLink.innerHTML = `
      <div class="scenario-card__image">
        <span>${scenario.learning_path}</span>
      </div>
      <div class="scenario-card__content">
        <h3 class="scenario-card__title">${scenario.title}</h3>
        <p class="scenario-card__description">${scenario.description}</p>
        <div class="scenario-card__meta">
          <span class="meta-tag">Difficulty: ${scenario.difficulty}</span>
        </div>
      </div>
    `

    listContainer.appendChild(cardLink)
  })
}

// Load scenarios on page load
document.addEventListener('DOMContentLoaded', async () => {
  await updateUIText()
  await loadScenarios()
})
