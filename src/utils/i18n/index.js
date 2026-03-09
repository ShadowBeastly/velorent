"use client";
import { createContext, useContext, useState, useCallback } from "react";
import de from "./de";
import en from "./en";

const translations = { de, en };
const I18nContext = createContext(null);

export function I18nProvider({ children }) {
    const [locale, setLocale] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("velorent_locale") || "de";
        }
        return "de";
    });

    const t = useCallback(
        (key, params) => {
            let text = translations[locale]?.[key] || translations.de[key] || key;
            if (params) {
                Object.entries(params).forEach(([k, v]) => {
                    text = text.replace(`{${k}}`, v);
                });
            }
            return text;
        },
        [locale]
    );

    const changeLocale = useCallback((newLocale) => {
        setLocale(newLocale);
        localStorage.setItem("velorent_locale", newLocale);
    }, []);

    return (
        <I18nContext.Provider value={{ t, locale, changeLocale }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error("useI18n must be used within I18nProvider");
    return ctx;
}
