import '../style.css'

// Define the structure of a scenario object
interface Scenario {
  id: string
  title: string
  learning_path: string
  difficulty: 'Medium' | 'Hard'
  description: string
}

// A static list of five scenarios with descriptions
const scenariosData: Scenario[] = [
  {
    id: 'S001',
    title: 'The Asymptomatic Hypertensive',
    learning_path: 'Managing Medication Adherence',
    difficulty: 'Medium',
    description:
      'Confront a pleasant but firm patient who feels perfectly healthy despite their clinical data showing hypertension. Your goal is to uncover their reasons for non-adherence and collaboratively agree on a treatment plan.',
  },
  {
    id: 'S002',
    title: 'The Overcrowded Pediatric Ward',
    learning_path: 'Conflict Management & Setting Boundaries',
    difficulty: 'Hard',
    description:
      'Navigate a high-emotion conflict with the terrified parents of a sick child. Your goal is to de-escalate their anger and gain cooperation when hospital policy prevents you from giving them what they want.',
  },
  {
    id: 'S003',
    title: 'The Antibiotic Skeptic',
    learning_path: 'Managing Misinformation',
    difficulty: 'Hard',
    description:
      'Build trust with an intelligent patient who is deeply skeptical of Western medicine. Can you navigate their beliefs about natural remedies to negotiate treatment for a serious bacterial infection?',
  },
  {
    id: 'S004',
    title: 'The Hidden Agenda',
    learning_path: 'Information Gathering',
    difficulty: 'Medium',
    description:
      "Your patient reveals a potentially serious symptom just as you have your hand on the doorknob. Can you manage the patient's embarrassment and skillfully re-engage to gather critical information?",
  },
  {
    id: 'S005',
    title: 'The Self-Diagnosed Patient',
    learning_path: 'Managing Patient Expectations',
    difficulty: 'Medium',
    description:
      'Face a data-driven patient who has already diagnosed themselves using an AI and now just wants a prescription. Can you validate their effort while explaining the vital need for a physical examination?',
  },
]

// Find the container element on the page
const listContainer = document.getElementById('scenario-list') as HTMLElement | null

// Function to load and display the scenarios
function loadScenarios() {
  if 