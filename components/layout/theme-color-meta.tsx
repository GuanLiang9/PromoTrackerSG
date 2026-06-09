"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const COLORS = { dark: "#0b0d14", light: "#ffffff" };

export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = resolvedTheme === "dark" ? COLORS.dark : COLORS.light;
    document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
      el.setAttribute("content", color);
    });
  }, [resolvedTheme]);

  return null;
}
