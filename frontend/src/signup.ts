import '../style.css'

// Elements
const signupForm = document.querySelector<HTMLFormElement>('#signup-form')!
const emailInput = document.querySelector<HTMLInputElement>('#signup-email')!
const passwordInput = document.querySelector<HTMLInputElement>('#signup-password')!

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()

  if (!email || !password) return

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // If backend returns JSON, optionally parse it to show message
    // const data = await response.json()

    alert('Success! Please check your email for a confirmation link.')
    window.location.href = '/login.html'
  } catch (err) {
    console.error('Signup error:', err)
    alert('Sign up failed. Please try again.')
  }
}) 