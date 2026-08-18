import React, { createContext, useContext, useMemo, useState } from "react";
import { COPY, detectLang, saveLang } from "./i18n.js";
import { speakHello } from "./speak.js";

const Ctx = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => detectLang());
  const setLang = (id) => {
    saveLang(id);
    setLangState(id);
    speakHello(id);
  };
  const t = COPY[lang] || COPY.en;
  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}
