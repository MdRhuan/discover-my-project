import { ReactNode, useEffect, useMemo, useState } from "react";
import { I18nContext, Lang, Currency, TRANSLATIONS } from "@/lib/i18n";

const LANG_KEY = "hub.lang";
const CURRENCY_KEY = "hub.currency";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem(LANG_KEY) as Lang) || "pt-BR",
  );
  const [currency, setCurrencyState] = useState<Currency>(
    () => (localStorage.getItem(CURRENCY_KEY) as Currency) || "BRL",
  );

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    localStorage.setItem(CURRENCY_KEY, currency);
  }, [currency]);

  const value = useMemo(
    () => ({
      lang,
      setLang: setLangState,
      currency,
      setCurrency: setCurrencyState,
      t: TRANSLATIONS[lang],
    }),
    [lang, currency],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
