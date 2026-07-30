import { DEFAULT_LOCALE, type Locale, LOCALES } from "@factfeed/contract";
import { getLocales } from "expo-localization";

const isSupportedLocale = (value: string): value is Locale =>
  LOCALES.includes(value as Locale);

export const getDeviceLocale = (): Locale => {
  const [preferred] = getLocales();
  const languageCode = preferred?.languageCode;

  if (languageCode && isSupportedLocale(languageCode)) {
    return languageCode;
  }

  return DEFAULT_LOCALE;
};
