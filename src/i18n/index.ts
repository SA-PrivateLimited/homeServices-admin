import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// English translations
import enCommon from './locales/en/common.json';
import enServiceCategories from './locales/en/serviceCategories.json';
import enSettings from './locales/en/settings.json';
import enErrors from './locales/en/errors.json';
import enProviders from './locales/en/providers.json';
import enCustomers from './locales/en/customers.json';
import enJobCards from './locales/en/jobCards.json';
import enAuth from './locales/en/auth.json';
import enMessages from './locales/en/messages.json';

// Hindi translations
import hiCommon from './locales/hi/common.json';
import hiServiceCategories from './locales/hi/serviceCategories.json';
import hiSettings from './locales/hi/settings.json';
import hiErrors from './locales/hi/errors.json';
import hiProviders from './locales/hi/providers.json';
import hiCustomers from './locales/hi/customers.json';
import hiJobCards from './locales/hi/jobCards.json';
import hiAuth from './locales/hi/auth.json';
import hiMessages from './locales/hi/messages.json';

// Merge all translations
const en = {
  common: enCommon,
  serviceCategories: enServiceCategories,
  settings: enSettings,
  errors: enErrors,
  providers: enProviders,
  customers: enCustomers,
  jobCards: enJobCards,
  auth: enAuth,
  messages: enMessages,
};

const hi = {
  common: hiCommon,
  serviceCategories: hiServiceCategories,
  settings: hiSettings,
  errors: hiErrors,
  providers: hiProviders,
  customers: hiCustomers,
  jobCards: hiJobCards,
  auth: hiAuth,
  messages: hiMessages,
};

const LANGUAGE_KEY = '@app_language';

// Language detection
const getStoredLanguage = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    return stored || 'en';
  } catch {
    return 'en';
  }
};

// Initialize i18n synchronously first, then update language from storage
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: {
      en: {translation: en},
      hi: {translation: hi},
    },
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

// Load stored language after initialization
getStoredLanguage().then(language => {
  i18n.changeLanguage(language);
});

// Change language
export const changeLanguage = async (language: 'en' | 'hi') => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    await i18n.changeLanguage(language);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'en';
};

export default i18n;
