import '../style.css'
import { t, translatorReady } from './translator'

// Elements
const loginForm = document.querySelector<HTMLFormElement>('#login-form')!
const emailInput = document.querySelector<HTMLInputElement>('#email')!
const passwordInput = document.querySelector<HTMLInputElement>('#password')!

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

// Update text content with translations
async function updateUIText() {
  // Wait for translator to be ready
  try {
    await translatorReady;
  } catch (error) {
    console.error('Failed to load translations:', error);
  }
  // Update title
  const title = document.querySelector('#login-title')
  if (title) title.textContent = t('auth.login_title')

  // Update form labels
  const emailLabel = document.querySelector('#email-label')
  if (emailLabel) emailLabel.textContent = t('auth.email_label')

  const passwordLabel = document.querySelector('#password-label')
  if (passwordLabel) passwordLabel.textContent = t('auth.password_label')

  // Update button text
  const loginButton = document.querySelector('#login-button')
  if (loginButton) loginButton.textContent = t('auth.login_button')

  // Update signup link
  const signupLink = document.querySelector('#signup-link')
  if (signupLink) {
    signupLink.innerHTML = `${t('auth.need_account')} <a href="/signup">${t('auth.signup_link')}</a>`
  }

  // Update email placeholder
  if (emailInput) {
    emailInput.placeholder = t('auth.email_placeholder')
  }

  if (navLogin) navLogin.textContent = t('nav.login');
  if (navSignup) navSignup.textContent = t('nav.sign_up');
  if (navLanguage) navLanguage.textContent = t('nav.language');
  if (navDemo) navDemo.textContent = t('nav.request_demo');
}

// Initialize translations when DOM is ready
document.addEventListener('DOMContentLoaded', updateUIText)

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
      window.location.href = '/scenarios'
    } else {
      alert(t('auth.login_failed'))
    }
  } catch (err) {
    console.error('Login error:', err)
    alert(t('auth.login_failed_generic'))
  }
}) 