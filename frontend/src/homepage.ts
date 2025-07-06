import '../style.css'
import { t, translatorReady } from './translator';

// Redirects user to signup when CTA button clicked
const cta = document.getElementById('try-it-out-button') as HTMLButtonElement | null
cta?.addEventListener('click', () => {
  window.location.href = '/signup'
})

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

  // Hero Section
  const heroTitle = document.getElementById('hero-title');
  const heroSubtitle = document.getElementById('hero-subtitle');
  const heroCta = document.getElementById('hero-cta');

  if (heroTitle) heroTitle.textContent = t('homepage.hero_title');
  if (heroSubtitle) heroSubtitle.textContent = t('homepage.hero_subtitle');
  if (heroCta) heroCta.textContent = t('homepage.try_free_scenario');

  // Logos Section
  const logosTitle = document.getElementById('logos-title');
  if (logosTitle) logosTitle.textContent = t('homepage.trusted_by');

  // Steps Section
  const stepsTitle = document.getElementById('steps-title');
  const stepsSubtitle = document.getElementById('steps-subtitle');
  const step1Title = document.getElementById('step1-title');
  const step1Description = document.getElementById('step1-description');
  const step2Title = document.getElementById('step2-title');
  const step2Description = document.getElementById('step2-description');
  const step3Title = document.getElementById('step3-title');
  const step3Description = document.getElementById('step3-description');

  if (stepsTitle) stepsTitle.textContent = t('homepage.better_way_title');
  if (stepsSubtitle) stepsSubtitle.textContent = t('homepage.better_way_subtitle');
  if (step1Title) step1Title.textContent = t('homepage.step_1_title');
  if (step1Description) step1Description.textContent = t('homepage.step_1_description');
  if (step2Title) step2Title.textContent = t('homepage.step_2_title');
  if (step2Description) step2Description.textContent = t('homepage.step_2_description');
  if (step3Title) step3Title.textContent = t('homepage.step_3_title');
  if (step3Description) step3Description.textContent = t('homepage.step_3_description');

  // Solutions Section
  const solutionsTitle = document.getElementById('solutions-title');
  const studentsTitle = document.getElementById('students-title');
  const studentsDescription = document.getElementById('students-description');
  const studentsButton = document.getElementById('students-button');
  const practitionersTitle = document.getElementById('practitioners-title');
  const practitionersDescription = document.getElementById('practitioners-description');
  const practitionersButton = document.getElementById('practitioners-button');
  const institutionsTitle = document.getElementById('institutions-title');
  const institutionsDescription = document.getElementById('institutions-description');
  const institutionsButton = document.getElementById('institutions-button');

  if (solutionsTitle) solutionsTitle.textContent = t('homepage.solutions_title');
  if (studentsTitle) studentsTitle.textContent = t('homepage.students_title');
  if (studentsDescription) studentsDescription.textContent = t('homepage.students_description');
  if (studentsButton) studentsButton.textContent = t('homepage.students_button');
  if (practitionersTitle) practitionersTitle.textContent = t('homepage.practitioners_title');
  if (practitionersDescription) practitionersDescription.textContent = t('homepage.practitioners_description');
  if (practitionersButton) practitionersButton.textContent = t('homepage.practitioners_button');
  if (institutionsTitle) institutionsTitle.textContent = t('homepage.institutions_title');
  if (institutionsDescription) institutionsDescription.textContent = t('homepage.institutions_description');
  if (institutionsButton) institutionsButton.textContent = t('homepage.institutions_button');

  // Testimonials Section
  const testimonial1Quote = document.getElementById('testimonial1-quote');
  const testimonial1Author = document.getElementById('testimonial1-author');
  const testimonial2Quote = document.getElementById('testimonial2-quote');
  const testimonial2Author = document.getElementById('testimonial2-author');

  if (testimonial1Quote) testimonial1Quote.textContent = t('homepage.testimonial_1');
  if (testimonial1Author) testimonial1Author.textContent = t('homepage.testimonial_1_author');
  if (testimonial2Quote) testimonial2Quote.textContent = t('homepage.testimonial_2');
  if (testimonial2Author) testimonial2Author.textContent = t('homepage.testimonial_2_author');

  // Final CTA Section
  const finalCtaTitle = document.getElementById('final-cta-title');
  const finalCtaSubtitle = document.getElementById('final-cta-subtitle');
  const finalCtaButton = document.getElementById('final-cta-button');

  if (finalCtaTitle) finalCtaTitle.textContent = t('homepage.final_cta_title');
  if (finalCtaSubtitle) finalCtaSubtitle.textContent = t('homepage.final_cta_subtitle');
  if (finalCtaButton) finalCtaButton.textContent = t('homepage.get_started_free');

  // Footer
  const footerBrand = document.getElementById('footer-brand');
  const footerCopyright = document.getElementById('footer-copyright');
  const footerSolutionsTitle = document.getElementById('footer-solutions-title');
  const footerStudents = document.getElementById('footer-students');
  const footerPractitioners = document.getElementById('footer-practitioners');
  const footerInstitutions = document.getElementById('footer-institutions');
  const footerCompanyTitle = document.getElementById('footer-company-title');
  const footerAbout = document.getElementById('footer-about');
  const footerBlog = document.getElementById('footer-blog');
  const footerContact = document.getElementById('footer-contact');
  const footerLegalTitle = document.getElementById('footer-legal-title');
  const footerPrivacy = document.getElementById('footer-privacy');
  const footerTerms = document.getElementById('footer-terms');

  if (footerBrand) footerBrand.textContent = t('footer.brand');
  if (footerCopyright) footerCopyright.textContent = t('footer.copyright');
  if (footerSolutionsTitle) footerSolutionsTitle.textContent = t('footer.solutions');
  if (footerStudents) footerStudents.textContent = t('footer.for_students');
  if (footerPractitioners) footerPractitioners.textContent = t('footer.for_practitioners');
  if (footerInstitutions) footerInstitutions.textContent = t('footer.for_institutions');
  if (footerCompanyTitle) footerCompanyTitle.textContent = t('footer.company');
  if (footerAbout) footerAbout.textContent = t('footer.about_us');
  if (footerBlog) footerBlog.textContent = t('footer.blog');
  if (footerContact) footerContact.textContent = t('footer.contact');
  if (footerLegalTitle) footerLegalTitle.textContent = t('footer.legal');
  if (footerPrivacy) footerPrivacy.textContent = t('footer.privacy_policy');
  if (footerTerms) footerTerms.textContent = t('footer.terms_of_service');
}

document.addEventListener('DOMContentLoaded', updateUIText);
