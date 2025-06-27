import '../style.css'
import Chart from 'chart.js/auto'

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

// --------------------------------------------------
// Auth check
// --------------------------------------------------
const token = localStorage.getItem('access_token')
if (!token) {
  window.location.href = '/login'
  throw new Error('No auth token, redirecting to login')
}

// --------------------------------------------------
// Canvas references
// --------------------------------------------------
const canvasElems: Record<string, HTMLCanvasElement | null> = {
  empathy: document.getElementById('empathy-chart') as HTMLCanvasElement | null,
  informationGathering: document.getElementById('information-gathering-chart') as HTMLCanvasElement | null,
  clarity: document.getElementById('clarity-chart') as HTMLCanvasElement | null,
  collaboration: document.getElementById('collaboration-chart') as HTMLCanvasElement | null,
  difficultConversations: document.getElementById('difficult-conversations-chart') as HTMLCanvasElement | null,
  radar: document.getElementById('skill-radar-chart') as HTMLCanvasElement | null,
}

// --------------------------------------------------
// Types based on new API
// --------------------------------------------------
interface ScoreEntry {
  skill_name: string
  score: number
}

interface EvaluationSession {
  created_at: string
  scores: ScoreEntry[]
}

// Mapping from API skill names to our local keys and display info
const SKILL_META: Record<string, { key: keyof typeof canvasElems; color: string; label: string; shortLabel: string; }> = {
  'Empathy & Rapport Building': {
    key: 'empathy',
    color: '#2563eb',
    label: 'Empathy & Rapport Building',
    shortLabel: 'Empathy',
  },
  'Information Gathering': {
    key: 'informationGathering',
    color: '#9333ea',
    label: 'Information Gathering',
    shortLabel: 'Info Gathering',
  },
  'Patient Education & Clarity': {
    key: 'clarity',
    color: '#f59e0b',
    label: 'Patient Education & Clarity',
    shortLabel: 'Clarity',
  },
  'Collaborative & Non-Judgmental Practice': {
    key: 'collaboration',
    color: '#10b981',
    label: 'Collaborative & Non-Judgmental Practice',
    shortLabel: 'Collaboration',
  },
  'Managing Difficult Conversations': {
    key: 'difficultConversations',
    color: '#ef4444',
    label: 'Managing Difficult Conversations',
    shortLabel: 'Difficult Convos',
  },
};

// --------------------------------------------------
// Helpers
// --------------------------------------------------
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
  dataPoints: (number | null)[],
  title: string,
  color: string,
) {
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: title,
          data: dataPoints,
          borderColor: color,
          backgroundColor: color,
          fill: false,
          tension: 0.3,
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: title,
          padding: { top: 10, bottom: 20 },
          font: { size: 16, weight: 'bold' },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          max: 5,
          ticks: { stepSize: 1 },
        },
      },
    },
  })
}

function createRadarChart(
  ctx: HTMLCanvasElement,
  labels: string[],
  dataPoints: number[],
) {
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Latest Score',
          data: dataPoints,
          backgroundColor: 'hsla(197, 89%, 43%, 0.2)',
          borderColor: 'hsla(197, 89%, 43%, 1)',
          pointBackgroundColor: 'hsla(197, 89%, 43%, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'hsla(197, 89%, 43%, 1)'
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        r: {
          angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
          grid: { color: 'rgba(0, 0, 0, 0.1)' },
          pointLabels: { font: { size: 13, weight: 500 } },
          suggestedMin: 0,
          suggestedMax: 5,
          ticks: { stepSize: 1, backdropColor: 'transparent' },
        },
      },
    },
  })
}

// --------------------------------------------------
// Main loader
// --------------------------------------------------
async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/me/history`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const sessions: EvaluationSession[] = await res.json()
    if (sessions.length === 0) {
      alert('No evaluation history yet.')
      return
    }

    // Sort sessions oldest -> newest
    sessions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const labels: string[] = []
    // Initialise data arrays for each skill
    const skillSeries: Record<keyof typeof canvasElems, (number | null)[]> = {
      empathy: [],
      informationGathering: [],
      clarity: [],
      collaboration: [],
      difficultConversations: [],
    }

    sessions.forEach((session) => {
      labels.push(formatDate(session.created_at))

      // Build a map for quick lookup for this session
      const scoreMap = new Map(session.scores.map((s) => [s.skill_name, s.score]))

      // For each skill, push score or null
      Object.values(SKILL_META).forEach(({ key, label }) => {
        const score = scoreMap.has(label) ? scoreMap.get(label)! : null
        skillSeries[key].push(score)
      })
    })

    // Create charts for each skill
    Object.values(SKILL_META).forEach(({ key, label, color }) => {
      const ctx = canvasElems[key]
      if (ctx) {
        createLineChart(ctx, labels, skillSeries[key], label, color)
      }
    })

    // --- New block for Radar Chart ---
    const latestSession = sessions[sessions.length - 1]
    if (latestSession) {
      const radarLabels: string[] = []
      const radarData: number[] = []

      Object.values(SKILL_META).forEach(({ label }) => {
        const scoreEntry = latestSession.scores.find((s) => s.skill_name === label)
        // Using shorter labels for the radar chart for readability
        radarLabels.push(SKILL_META[label].shortLabel);
        radarData.push(scoreEntry ? scoreEntry.score : 0)
      })

      const radarCtx = canvasElems.radar
      if (radarCtx) {
        createRadarChart(radarCtx, radarLabels, radarData)
      }
    }
    // --- End of new block ---
  } catch (err) {
    console.error('Failed to load dashboard data:', err)
    alert('Failed to load dashboard data.')
  }
}

loadHistory() 