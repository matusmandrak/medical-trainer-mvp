import '../style.css'

// Elements
const loginForm = document.querySelector<HTMLFormElement>('#login-form')!
const emailInput = document.querySelector<HTMLInputElement>('#email')!
const passwordInput = document.querySelector<HTMLInputElement>('#password')!

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()

  if (!email || !password) return

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: { session?: { access_token?: string } } = await response.json()
    if (data.session && data.session.access_token) {
      localStorage.setItem('access_token', data.session.access_token)
      window.location.href = '/index.html'
    } else {
      alert('Login failed: invalid credentials')
    }
  } catch (err) {
    console.error('Login error:', err)
    alert('Login failed. Please try again.')
  }
}) 