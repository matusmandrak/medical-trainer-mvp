import { t, translatorReady } from './translator';

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

  // About page content
  const aboutTitle = document.getElementById('about-title');
  const aboutParagraph1 = document.getElementById('about-paragraph1');
  const aboutParagraph2 = document.getElementById('about-paragraph2');
  const aboutBeliefsTitle = document.getElementById('about-beliefs-title');
  const belief1 = document.getElementById('belief1');
  const belief2 = document.getElementById('belief2');
  const belief3 = document.getElementById('belief3');
  const belief4 = document.getElementById('belief4');

  if (aboutTitle) aboutTitle.textContent = t('about.title');
  if (aboutParagraph1) aboutParagraph1.textContent = t('about.story_p1');
  if (aboutParagraph2) aboutParagraph2.textContent = t('about.story_p2');
  if (aboutBeliefsTitle) aboutBeliefsTitle.textContent = t('about.core_beliefs');
  if (belief1) belief1.textContent = t('about.belief_1');
  if (belief2) belief2.textContent = t('about.belief_2');
  if (belief3) belief3.textContent = t('about.belief_3');
  if (belief4) belief4.textContent = t('about.belief_4');

  // Footer
  const footerCopyright = document.getElementById('footer-copyright');
  if (footerCopyright) footerCopyright.textContent = t('footer.copyright');
}

document.addEventListener('DOMContentLoaded', updateUIText); 