"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { translations, type Lang, type TranslationKey } from "@/lib/translations";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "nl",
  setLang: () => {},
  t: (key) => translations.nl[key],
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("nl");

  useEffect(() => {
    const stored = localStorage.getItem("lang");
    if (stored === "nl" || stored === "en") setLangState(stored as Lang);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => translations[lang][key] ?? translations.nl[key],
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
