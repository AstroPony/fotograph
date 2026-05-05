"use client";

import { useState, useEffect, useRef } from "react";

const LANGS = [
  { code: "nl", flag: "🇳🇱", label: "Nederlands" },
  { code: "en", flag: "🇬🇧", label: "English" },
];

export function LangSwitcher() {
  const [lang, setLang] = useState("nl");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("lang");
    if (stored === "en" || stored === "nl") setLang(stored);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(code: string) {
    setLang(code);
    localStorage.setItem("lang", code);
    setOpen(false);
  }

  const current = LANGS.find((l) => l.code === lang)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm leading-none cursor-pointer hover:opacity-70 transition-opacity"
        aria-label="Taal wisselen"
      >
        {current.flag}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white border border-black/10 shadow-md z-50 min-w-[140px]">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => select(l.code)}
              className={`flex items-center gap-2 w-full px-3 py-2 text-xs uppercase tracking-widest font-medium text-left hover:bg-black/5 transition-colors ${
                l.code === lang ? "text-black" : "text-black/40"
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
