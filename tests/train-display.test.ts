import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { parseHiddenTrainLabels, TRAIN_LABELS, TRAIN_DISPLAY_STORAGE_KEY, trainDisplayBootstrap } from "../src/lib/train-display";

test("all display combinations restore before paint without changing the theme", () => {
  for (let mask = 0; mask < 16; mask++) {
    const saved = TRAIN_LABELS.filter((_, index) => mask & (1 << index)).join(" ");
    const document = { documentElement: { dataset: { theme: "dark", trainLabelsHidden: "" } } };
    runInNewContext(trainDisplayBootstrap, { document, localStorage: { getItem(key: string) { assert.equal(key, TRAIN_DISPLAY_STORAGE_KEY); return saved; } } });
    assert.equal(document.documentElement.dataset.trainLabelsHidden, saved);
    assert.equal(document.documentElement.dataset.theme, "dark");
  }
});

test("missing, malformed and unavailable storage leave labels visible", () => {
  for (const saved of [null, "{broken}", "unknown", undefined]) {
    const document = { documentElement: { dataset: {} as Record<string, string> } };
    runInNewContext(trainDisplayBootstrap, { document, localStorage: { getItem() { if (saved === undefined) throw new Error("SecurityError"); return saved; } } });
    assert.equal(document.documentElement.dataset.trainLabelsHidden, "");
  }
  assert.equal(parseHiddenTrainLabels("type operator operator unknown"), "operator type");
  assert.equal(parseHiddenTrainLabels(null), "");
});

test("display controls cover collection browsing and details, excluding forms and DCC", async () => {
  const { hasVehicleDisplayControls } = await import("../src/lib/train-display");
  for (const section of ["soupravy", "lokomotivy", "vozy", "nakladni-vozy", "katalog", "vozidla"]) {
    assert.equal(hasVehicleDisplayControls(`/${section}`), true);
    assert.equal(hasVehicleDisplayControls(`/${section}/61`), true);
    assert.equal(hasVehicleDisplayControls(`/${section}/novy`), false);
    assert.equal(hasVehicleDisplayControls(`/${section}/61/upravit`), false);
  }
  for (const path of ["/dcc", "/prihlaseni", "/", "/api/vozidla", "/katalog-invalid"]) {
    assert.equal(hasVehicleDisplayControls(path), false);
  }
});
