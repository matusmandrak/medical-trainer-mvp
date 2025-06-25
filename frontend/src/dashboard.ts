import '../style.css'
import Chart from 'chart.js/auto'

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

// Verify auth token
const token = localStorage.getItem('access_token')
if (!token) {
  window.location.href = '/login.html'
  throw new Error('No auth token, redirecting to login')
}

// Canvas elements
const empathyCanvas = document.getElementById('empathy-chart') as HTMLCanvasElement | null
const questioningCanvas = document.getElementById('questioning-chart') as HTMLCanvasElement | null
const problemCanvas = document.getElementById('problem-solving-chart') as HTMLCanvasElement | null

if (!empathyCanvas || !questioningCanvas || !problemCanvas) {
  console.error('Dashboard canvas elements not found.')
}

interface EvaluationRecord {
  created_at: string
  empathy_score: number
  investigative_questioning_score: number
  collaborative_problem_solving_score: number
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function createLineChart(
  ctx: HTMLCanvasElement,
  labels: string[],
  dataPoints: number[],
  title: string,
  color: string
) {
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: title,
          data: dataPoints,
          fill: false,
          borderColor: color,
          backgroundColor: color,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: title,
          padding: {
            top: 10,
            bottom: 20,
          },
          font: {
            size: 16,
            weight: 'bold',
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          max: 5,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  })
}

async function loadHistory() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/me/history`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`)
    }

    const history: EvaluationRecord[] = await response.json()

    if (!history.length) {
      alert('No evaluation history yet.')
      return
    }

    // Sort by created_at ascending
    history.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const labels = history.map(rec => formatDate(rec.created_at))

    const empathyData = history.map(rec => rec.empathy_score)
    const questioningData = history.map(rec => rec.investigative_questioning_score)
    const problemData = history.map(rec => rec.collaborative_problem_solving_score)

    if (empathyCanvas) {
      createLineChart(empathyCanvas, labels, empathyData, 'Empathy Score', '#2563eb')
    }
    if (questioningCanvas) {
      createLineChart(questioningCanvas, labels, questioningData, 'Investigative Questioning Score', '#10b981')
    }
    if (problemCanvas) {
      createLineChart(problemCanvas, labels, problemData, 'Collaborative Problem Solving Score', '#f59e0b')
    }
  } catch (err) {
    console.error('Failed to load history:', err)
    alert('Failed to load dashboard data.')
  }
}

loadHistory() 