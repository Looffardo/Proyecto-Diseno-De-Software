// src/i18n/I18nProvider.jsx
import { createContext, useContext, useState, useMemo } from "react";
import es from "./locales/es.json";
import en from "./locales/en.json";

const LANGS = { es, en };

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState("es"); // idioma por defecto

  const value = useMemo(() => {
    function t(key, vars) {
      const parts = key.split(".");
      let current = LANGS[lang];

      for (const p of parts) {
        if (current == null) break;
        current = current[p];
      }

      if (typeof current !== "string") return key;

      // reemplazar variables tipo {{name}}
      if (vars) {
        return current.replace(/{{(\w+)}}/g, (_, v) =>
          vars[v] != null ? String(vars[v]) : ""
        );
      }

      return current;
    }

    return { lang, setLang, t };
  }, [lang]);

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n debe usarse dentro de <I18nProvider>");
  }
  return ctx;
}
