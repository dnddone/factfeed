import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import { getDeviceLocale } from "@/utils/locale";

import en from "./locales/en.json";
import uk from "./locales/uk.json";

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    uk: { translation: uk },
  },
  /**
   * Best sync guess before `LocaleProvider` can read a persisted override
   * from AsyncStorage — avoids a startup flash of English on a uk device.
   */
  lng: getDeviceLocale(),
  fallbackLng: "en",
  keySeparator: false,
  nsSeparator: false,
  interpolation: {
    escapeValue: false,
  },
});

export { i18next };
