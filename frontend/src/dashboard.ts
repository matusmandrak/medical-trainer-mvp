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
          font: { 