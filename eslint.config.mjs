import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  { ignores: [".next/**", ".open-next/**", "pages-dist/**", "public/sw.js", "node_modules/**"] },
  {
    rules: {
      "@next/next/no-img-element": "off",
      // New React-compiler rules in eslint-config-next 16; existing code predates them.
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default config;
