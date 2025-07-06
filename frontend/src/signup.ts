import '../style.css'
import { t, getCurrentLanguage, translatorReady } from './translator'

// Elements
const signupForm = document.querySelector<HTMLFormElement>('#signup-form')!
const nameInput = document.querySelector<HTMLInputElement>('#name')!
const emailInput = document.querySelector<HTMLInputElement>('#email')!
const passwordInput = document.querySelector<HTMLInputElement>('#password')!

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

async function updateUIText() {
  // Wait for translator to be ready
  try {
    await translatorReady;
  } catch (error) {
    console.error('Failed to load translations:', error);
  }

  // Navigation
  const navSolutions = document.getElementById('nav-solutions');
  const navScenarios = document.getElementById('nav-scenarios');
  const navPricing = document.getElementById('nav-pricing');
  const navAbout = document.getElementById('nav-about');
  const navLogin = document.getElementById('nav-login');
  const navSignup = document.getElementById('nav-signup');
  const navLanguage = document.getElementById('nav-language');
  const navDemo = document.getElementById('nav-demo');

  if (navSolutions) navSolutions.textContent = t('nav.solutions');
  if (navScenarios) navScenarios.textContent = t('nav.scenarios');
  if (navPricing) navPricing.textContent = t('nav.pricing');
  if (navAbout) navAbout.textContent = t('nav.about_us');
  if (navLogin) navLogin.textContent = t('nav.login');
  if (navSignup) navSignup.textContent = t('nav.sign_up');
  if (navLanguage) navLanguage.textContent = t('nav.language');
  if (navDemo) navDemo.textContent = t('nav.request_demo');

  // Signup form
  const signupTitle = document.getElementById('signup-title');
  const nameLabel = document.getElementById('name-label');
  const emailLabel = document.getElementById('email-label');
  const passwordLabel = document.getElementById('password-label');
  const signupButton = document.getElementById('signup-button');
  const signupLinkText = document.getElementById('signup-link-text');
  const signinLink = document.getElementById('signin-link');

  if (signupTitle) signupTitle.textContent = t('auth.signup_title');
  if (nameLabel) nameLabel.textContent = t('auth.full_name_label');
  if (emailLabel) emailLabel.textContent = t('auth.email_label');
  if (passwordLabel) passwordLabel.textContent = t('auth.password_label');
  if (signupButton) signupButton.textContent = t('auth.signup_button');
  if (signupLinkText) signupLinkText.textContent = t('auth.have_account');
  if (signinLink) signinLink.textContent = t('auth.login_link');

  // Update input placeholders
  if (nameInput) nameInput.placeholder = t('auth.full_name_label');
  if (emailInput) emailInput.placeholder = t('auth.email_placeholder');
  if (passwordInput) passwordInput.placeholder = t('auth.password_label');
}

signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault()

  const name = nameInput.value.trim()
  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()

  if (!name || !email || !password) return

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password, 
        username: name,
        lang: getCurrentLanguage() 
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // If backend returns JSON, optionally parse it to show message
    // const data = await response.json()

    alert(t('auth.signup_success'))
    window.location.href = '/login'
  } catch (err) {
    console.error('Signup error:', err)
    alert(t('auth.signup_failed'))
  }
})

document.addEventListener('DOMContentLoaded', updateUIText); 