"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Locale, DICTIONARIES } from "@/lib/i18n";

type LanguageContextType = {
  language: Locale;
  setLanguage: (lang: Locale) => void;
  t: (keyPath: string) => any;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("site_language") as Locale;
    if (saved === "en" || saved === "es") {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Locale) => {
    setLanguageState(lang);
    localStorage.setItem("site_language", lang);
  };

  const t = (keyPath: string) => {
    const keys = keyPath.split(".");
    let current: any = DICTIONARIES[language];
    for (const key of keys) {
      if (current[key] === undefined) {
        console.warn(`Missing translation key: ${keyPath} for lang: ${language}`);
        return keyPath;
      }
      current = current[key];
    }
    return current;
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
