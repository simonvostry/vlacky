import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { parseTheme, themeBootstrap, THEME_STORAGE_KEY } from "../src/lib/theme";

test("first paint uses only an explicit saved theme, defaulting to light", () => {
  for (const [saved, expected] of [[null, "light"], ["light", "light"], ["dark", "dark"], ["system", "light"], ["broken", "light"]]) {
    const document = { documentElement: { dataset: {} as Record<string, string> } };
    runInNewContext(themeBootstrap, { document, localStorage: { getItem(key: string) { assert.equal(key, THEME_STORAGE_KEY); return saved; } } });
    assert.equal(document.documentElement.dataset.theme, expected);
  }
});

test("restricted browser storage cannot break initial rendering", () => {
  const document = { documentElement: { dataset: {} as Record<string, string> } };
  runInNewContext(themeBootstrap, { document, localStorage: { getItem() { throw new Error("SecurityError"); } } });
  assert.equal(document.documentElement.dataset.theme, "light");
  assert.equal(parseTheme(undefined), "light");
  assert.equal(parseTheme("dark"), "dark");
});
