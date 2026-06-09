"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const COLORS = { dark: "#0b0d14", light: "#ffffff" };

export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = resolvedTheme === "dark" ? COLORS.dark : COLORS.light;
    // Remove all existing theme-color metas (including media-query variants) and
    // insert a single fresh one so Chrome re-evaluates the status bar colour.
    document.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = color;
    document.head.appendChild(meta);
  }, [resolvedTheme]);

  return null;
}
