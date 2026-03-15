import { format, isValid, parse } from "date-fns";
import { es, enUS } from "date-fns/locale";
import logger from "./logger.js";
import i18n from "../i18n";

const locales = { es, en: enUS };
export const DATE_FORMAT_OPTIONS = ["yyyy/MM/dd", "dd/MM/yyyy", "MM/dd/yyyy"];
export const getDateLocale = (locale) => locales[locale] || enUS;

export const normalizeDateFormat = (formatStr) =>
  DATE_FORMAT_OPTIONS.includes(formatStr) ? formatStr : DATE_FORMAT_OPTIONS[0];

export const formatDate = (date, formatStr, locale) => {
  if (!date || !(date instanceof Date) || isNaN(date)) {
    return i18n.t("noDate");
  }
  try {
    return format(date, normalizeDateFormat(formatStr), {
      locale: getDateLocale(locale)
    });
  } catch (error) {
    logger.warn("Error formatting date:", error);
    return i18n.t("invalidDate");
  }
};

export const parseDate = (value, formatStr, locale) => {
  const text = value?.trim();
  if (!text) {
    return null;
  }

  try {
    const safeFormat = normalizeDateFormat(formatStr);
    const parsed = parse(text, safeFormat, new Date(), {
      locale: getDateLocale(locale),
    });

    if (!isValid(parsed)) {
      return null;
    }

    return format(parsed, safeFormat, {
      locale: getDateLocale(locale),
    }) === text
      ? parsed
      : null;
  } catch (error) {
    logger.warn("Error parsing date:", error);
    return null;
  }
};
