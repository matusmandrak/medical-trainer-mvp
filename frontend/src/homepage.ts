import '../style.css'

// Redirects user to signup when CTA button clicked
const cta = document.getElementById('try-it-out-button') as HTMLButtonElement | null
cta?.addEventListener('click', () => {
  window.location.href = '/signup'
})
