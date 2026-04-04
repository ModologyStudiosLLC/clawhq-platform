"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    // Read persisted preference; default dark
    const stored = localStorage.getItem("clawhq-theme");
    const isDark = stored !== "light";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("clawhq-theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="p-2 rounded-lg transition-colors"
      style={{ color: "var(--color-text-muted)" }}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
