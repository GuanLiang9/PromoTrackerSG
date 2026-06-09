"use client";

import { useEffect } from "react";

const COLORS = { dark: "#0b0d14", light: "#ffffff" };

function applyThemeColor() {
  const isDark = document.documentElement.classList.contains("dark");
  const color = isDark ? COLORS.dark : COLORS.light;
  // Keep one persistent non-media meta and update content in-place so Chrome
  // detects the change and repaints the status bar.
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  if (!meta) {
    document.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
    meta = document.createElement("meta") as HTMLMetaElement;
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
}

export function ThemeColorMeta() {
  useEffect(() => {
    // Apply immediately on mount (covers first load in dark mode)
    applyThemeColor();

    // MutationObserver fires synchronously when next-themes flips html.class,
    // before any re-render, so the status bar updates with zero lag.
    const observer = new MutationObserver(applyThemeColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
