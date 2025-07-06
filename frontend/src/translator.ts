// Translation system for the Medical Communication Trainer
type TranslationData = Record<string, any>;

class Translator {
  private translations: TranslationData = {};
  private currentLanguage: string = 'en';
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.currentLanguage = this.getCurrentLanguageFromStorage();
    // Hide content initially to avoid flash
    this.hideContentUntilReady();
  }

  private hideContentUntilReady() {
    // Add CSS to hide content initially
    const style = document.createElement('style');
    style.textContent = `
      .translator-loading * {
        visibility: hidden !important;
      }
      .translator-loading .loading-spinner {
        visibility: visible !important;
      }
    `;
    document.head.appendChild(style);
    
    // Add class to body
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.classList.add('translator-loading');
      });
    } else {
      document.body.classList.add('translator-loading');
    }
  }

  private showContentWhenReady() {
    document.body.classList.remove('translator-loading');
  }

  /**
   * Get the current language from localStorage, defaulting to 'en'
   */
  getCurrentLanguageFromStorage(): string {
    try {
      const saved = localStorage.getItem('medcomm-language');
      return saved && ['en', 'cs', 'sk'].includes(saved) ? saved : 'en';
    } catch (error) {
      console.warn('Could not load language preference:', error);
      return 'en';
    }
  }

  /**
   * Get the current language
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Load the correct JSON file based on the current language
   */
  async loadLanguageFile(language?: string): Promise<void> {
    const langToLoad = language || this.currentLanguage;
    
    // Return existing promise if already loading
    if (this.loadPromise && !language) {
      return this.loadPromise;
    }
    
    // Skip loading if already loaded with correct language
    if (this.isLoaded && this.currentLanguage === langToLoad) {
      return;
    }

    this.loadPromise = this.doLoadLanguageFile(langToLoad);
    await this.loadPromise;
    
    // Show content after translations are loaded
    this.showContentWhenReady();
    
    return this.loadPromise;
  }

  private async doLoadLanguageFile(langToLoad: string): Promise<void> {
    try {
      const response = await fetch(`/${langToLoad}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${langToLoad}.json`);
      }
      
      this.translations = await response.json();
      this.currentLanguage = langToLoad;
      this.isLoaded = true;
      console.log(`Successfully loaded ${langToLoad} translations`);
    } catch (error) {
      console.error(`Error loading ${langToLoad}.json:`, error);
      
      // Fallback to English if loading fails and we're not already trying English
      if (langToLoad !== 'en') {
        console.warn(`Falling back to English`);
        return this.doLoadLanguageFile('en');
      } else {
        // If English also fails, use empty translations
        this.translations = {};
        this.isLoaded = true;
        console.error('Failed to load any translations');
      }
    }
  }

  /**
   * Main translation function that takes a key and returns the correct translated string
   */
  t(key: string, params?: Record<string, string | number>): string {
    if (!this.isLoaded) {
      console.warn('Translations not loaded yet. Returning key:', key);
      return key;
    }

    const translation = this.getNestedTranslation(key) || key;
    
    // Replace parameters in the translation if provided
    if (params) {
      return this.replacePlaceholders(translation, params);
    }
    
    return translation;
  }

  /**
   * Get nested translation value using dot notation
   */
  private getNestedTranslation(key: string): string | null {
    const keys = key.split('.');
    let value: any = this.translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }
    
    return typeof value === 'string' ? value : null;
  }

  /**
   * Replace placeholders in translation strings
   * Example: "Hello {name}" with params {name: "John"} becomes "Hello John"
   */
  private replacePlaceholders(text: string, params: Record<string, string | number>): string {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  /**
   * Save language preference to localStorage
   */
  private saveLanguageToStorage(language: string): void {
    try {
      localStorage.setItem('medcomm-language', language);
    } catch (error) {
      console.warn('Could not save language preference:', error);
    }
  }

  /**
   * Save language preference to user profile via API
   */
  private async saveLanguageToProfile(language: string): Promise<void> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.warn('No access token found, skipping profile update');
        return;
      }

      const response = await fetch('/api/me/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          preferred_language: language
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save language preference');
      }

      console.log('Language preference saved to profile successfully');
    } catch (error) {
      console.error('Error saving language preference to profile:', error);
      // Don't throw - this is not critical for language switching
    }
  }

  /**
   * Handle language switcher button clicks
   * Saves to localStorage, calls API, and reloads page
   */
  async switchLanguage(newLanguage: string): Promise<void> {
    if (!['en', 'cs', 'sk'].includes(newLanguage)) {
      console.error(`Unsupported language: ${newLanguage}`);
      return;
    }

    try {
      // Save to localStorage first
      this.saveLanguageToStorage(newLanguage);
      
      // Save to user profile (non-blocking)
      await this.saveLanguageToProfile(newLanguage);
      
      // Reload the page to apply the new language
      window.location.reload();
    } catch (error) {
      console.error('Error switching language:', error);
      // Still reload even if API call failed, as localStorage was updated
      window.location.reload();
    }
  }

  /**
   * Initialize language switcher buttons
   */
  initializeLanguageSwitcher(): void {
    // Find all language switcher buttons
    const languageButtons = document.querySelectorAll('[data-language]');
    
    languageButtons.forEach(button => {
      const language = button.getAttribute('data-language');
      if (language) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          this.switchLanguage(language);
        });
      }
    });

    // Mark current language button as active
    const currentButton = document.querySelector(`[data-language="${this.currentLanguage}"]`);
    if (currentButton) {
      currentButton.classList.add('active');
    }
  }

  /**
   * Get all available languages
   */
  getAvailableLanguages(): Array<{code: string, name: string}> {
    return [
      { code: 'en', name: 'English' },
      { code: 'cs', name: 'Čeština' },
      { code: 'sk', name: 'Slovenčina' }
    ];
  }
}

// Create and export a singleton instance
const translator = new Translator();

// Initialize the translator when the module is loaded with immediate execution
const initPromise = (async () => {
  await translator.loadLanguageFile();
  
  // Initialize language switcher after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      translator.initializeLanguageSwitcher();
    });
  } else {
    translator.initializeLanguageSwitcher();
  }
})();

// Export the instance and utility functions
export default translator;

// Export convenience functions
export const t = (key: string, params?: Record<string, string | number>): string => {
  return translator.t(key, params);
};

export const getCurrentLanguage = (): string => {
  return translator.getCurrentLanguage();
};

export const switchLanguage = (language: string): Promise<void> => {
  return translator.switchLanguage(language);
};

export const getAvailableLanguages = () => {
  return translator.getAvailableLanguages();
};

// Export the initialization promise
export const translatorReady = initPromise;
