export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "vlacky-theme";
export function parseTheme(value: unknown): Theme {
  return value === "dark" ? "dark" : "light";
}

// Runs before the page paints. Storage can be unavailable in private/restricted browsers.
export const themeBootstrap = `(function(){var t="light";try{t=localStorage.getItem("${THEME_STORAGE_KEY}")==="dark"?"dark":"light"}catch(e){}document.documentElement.dataset.theme=t})();`;
