import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

const locales = { es, en: enUS };

export const formatDate = (date, formatStr, locale) => {
  if (!date || !(date instanceof Date) || isNaN(date)) {
    return "No date";
  }
  try {
    return format(date, formatStr, { 
      locale: locales[locale] || enUS 
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
};