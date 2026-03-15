import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import esTranslation from './locales/es.json';
import logger from "./utils/logger.js";

const USER_CONFIG_STORAGE_KEY = "chronicon_user_config";

let initialLanguage = 'en'; // Default fallback
try {
  const storedConfig = localStorage.getItem(USER_CONFIG_STORAGE_KEY);
  if (storedConfig) {
    const parsedConfig = JSON.parse(storedConfig);
    if (parsedConfig.language) {
      initialLanguage = parsedConfig.language;
    }
  }
} catch (error) {
  logger.warn("Error reading user config from localStorage for i18n:", error);
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation.translation,
      },
      es: {
        translation: esTranslation.translation,
      },
    },
    lng: initialLanguage, // Use the dynamically determined language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already escapes by default
    },
  });

export default i18n;
