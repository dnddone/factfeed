import React, { createContext, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";

import { DEFAULT_LOCALE, type Locale } from "@factfeed/contract";

import { LOCALE_STORAGE_KEY } from "@/constants/storage.constants";
import { getDeviceLocale, isSupportedLocale } from "@/utils/locale";

type State = {
  locale: Locale;
  setLocale: (next: Locale) => void;
};

const LocaleContext = createContext<State | null>(null);

type Props = {
  children: React.ReactNode;
};

/**
 * Single source of truth for the app's content/UI locale (Phase 6 Settings),
 * backed by i18next's active language so every `t()` call and the feed's
 * `locale` query param stay in lockstep. Persists the choice to AsyncStorage;
 * falls back to the device locale on first launch.
 */
export const LocaleProvider: React.FC<Props> = ({ children }) => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const run = async () => {
      const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
      const initial =
        stored && isSupportedLocale(stored) ? stored : getDeviceLocale();

      if (initial !== i18n.language) {
        i18n.changeLanguage(initial);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = (next: Locale) => {
    i18n.changeLanguage(next);
    AsyncStorage.setItem(LOCALE_STORAGE_KEY, next);
  };

  const locale = isSupportedLocale(i18n.language)
    ? i18n.language
    : DEFAULT_LOCALE;

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocaleContext = (): State => {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocaleContext must be used within a LocaleProvider");
  }

  return context;
};
