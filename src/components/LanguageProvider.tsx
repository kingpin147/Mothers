"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Locale, DICTIONARIES } from "@/lib/i18n";
import { applyTranslations, initI18nObserver, tStr } from "@/lib/i18nEngine";

type LanguageContextType = {
  language: Locale;
  setLanguage: (lang: Locale) => void;
  t: (keyPathOrText: string) => any;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Locale>("en");

  useEffect(() => {
    const saved =
      (localStorage.getItem("site_language") as Locale) ||
      (localStorage.getItem("tm_lang") as Locale);
    const initialLang: Locale = saved === "en" || saved === "es" || saved === "fr" ? saved : "en";
    setLanguageState(initialLang);

    // Initialize the client DOM translation observer for dynamic elements
    initI18nObserver();
    applyTranslations(undefined, initialLang);
  }, []);

  const setLanguage = (lang: Locale) => {
    setLanguageState(lang);
    localStorage.setItem("site_language", lang);
    localStorage.setItem("tm_lang", lang);
    applyTranslations(undefined, lang);
    window.dispatchEvent(new CustomEvent("tm_lang_change", { detail: lang }));
  };

  const t = (keyPathOrText: string) => {
    if (!keyPathOrText) return "";
    
    // Check nested key in DICTIONARIES first (e.g. "hero.title" or "nav.home")
    if (keyPathOrText.includes(".")) {
      const keys = keyPathOrText.split(".");
      let current: any = DICTIONARIES[language] || DICTIONARIES.en;
      let found = true;
      for (const key of keys) {
        if (current && current[key] !== undefined) {
          current = current[key];
        } else {
          found = false;
          break;
        }
      }
      if (found && current !== undefined) return current;
    }

    // Direct dictionary lookup via i18nEngine
    return tStr(keyPathOrText, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

