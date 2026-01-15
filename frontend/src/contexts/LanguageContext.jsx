import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, getTranslation, getSectionTranslations } from '@/i18n/translations';

// Supported languages
export const LANGUAGES = {
  en: { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
};

const STORAGE_KEY = 'mytrack_language';
const DEFAULT_LANGUAGE = 'en';

// Detect browser language
const detectBrowserLanguage = () => {
  try {
    // Get browser language
    const browserLang = navigator.language || navigator.userLanguage || '';
    const langCode = browserLang.split('-')[0].toLowerCase();
    
    // Check if supported
    if (LANGUAGES[langCode]) {
      return langCode;
    }
    
    // Check navigator.languages array
    if (navigator.languages && navigator.languages.length > 0) {
      for (const lang of navigator.languages) {
        const code = lang.split('-')[0].toLowerCase();
        if (LANGUAGES[code]) {
          return code;
        }
      }
    }
  } catch (e) {
    console.warn('Could not detect browser language:', e);
  }
  
  return DEFAULT_LANGUAGE;
};

// Get initial language (from storage or browser detection)
const getInitialLanguage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGES[stored]) {
      return stored;
    }
  } catch (e) {
    console.warn('Could not read language from storage:', e);
  }
  
  return detectBrowserLanguage();
};

// Language Context
const LanguageContext = createContext(null);

// Language Provider Component
export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(getInitialLanguage);

  // Update HTML lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Save language to localStorage
  const setLanguage = useCallback((lang) => {
    if (LANGUAGES[lang]) {
      setLanguageState(lang);
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (e) {
        console.warn('Could not save language to storage:', e);
      }
    }
  }, []);

  // Translation function
  const t = useCallback((section, key) => {
    return getTranslation(section, key, language);
  }, [language]);

  // Get all translations for a section
  const tSection = useCallback((section) => {
    return getSectionTranslations(section, language);
  }, [language]);

  // Context value
  const value = {
    language,
    setLanguage,
    t,
    tSection,
    languages: LANGUAGES,
    isRTL: false, // No RTL languages currently
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Hook for getting translations for a specific section
export const useTranslation = (section) => {
  const { t, language } = useLanguage();
  
  return {
    t: (key) => t(section, key),
    language,
  };
};

export default LanguageContext;
