// lib/i18n.js
// Серверный модуль – без React, только данные и утилиты

import { ru } from './translations/ru';
import { ua } from './translations/ua';
import { en } from './translations/en';

export const SUPPORTED_LANGS = ["ru", "ua", "en"];

export const translations = {
  ru,
  ua,
  en
};
