import '../style.css'

interface Scenario {
  id: number | string
  title: string
  learning_path: string
  difficulty: string
}

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''
const listContainer = document.getElementById('scenario-list') as HTMLDivElement | null

if (!listContainer) {
  console.error('#scenario-list element not found')
}

async function loadScenarios() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scenarios`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const scenarios: Scenario[] = await response.json()

    if (!scenarios.length) {
      listContainer!.innerHTML = '<p>No scenarios available at the moment.</p>'
      return
    }

    scenarios.forEach((scenario) => {
      const link = document.createElement('a')
      link.href = `/trainer?scenario=${encodeURIComponent(String(scenario.id))}`
      link.classList.add('scenario-card')
      link.style.textDecoration = 'none'
      link.style.color = 'inherit'

      const card = document.createElement('div')
      card.style.border = '1px solid #e5e7eb'
      card.style.borderRadius = 'var(--border-radius)'
      card.style.padding = '1.25rem'
      card.style.background = '#ffffff'
      card.style.boxShadow = '0 3px 8px rgba(0,0,0,0.04)'
      card.style.height = '100%'

      const title = document.createElement('h3')
      title.textContent = scenario.title
      title.style.fontSize = '1.1rem'
      title.style.fontWeight = '600'
      title.style.marginBottom = '0.5rem'

      const learningPath = document.createElement('p')
      learningPath.textContent = `Learning Path: ${scenario.learning_path}`
      learningPath.style.fontSize = '0.9rem'
      learningPath.style.color = '#374151'
      learningPath.style.marginBottom = '0.25rem'

      const difficulty = document.createElement('p')
      difficulty.textContent = `Difficulty: ${scenario.difficulty}`
      difficulty.style.fontSize = '0.9rem'
      difficulty.style.color = '#6b7280'

      card.appendChild(title)
      card.appendChild(learningPath)
      card.appendChild(difficulty)
      link.appendChild(card)
      listContainer?.appendChild(link)
    })
  } catch (err) {
    console.error('Failed to load scenarios:', err)
    listContainer!.innerHTML = '<p>Failed to load scenarios.</p>'
  }
}

loadScenarios()
