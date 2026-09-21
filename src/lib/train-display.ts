export const TRAIN_DISPLAY_STORAGE_KEY = "vlacky-train-labels-hidden";
export const TRAIN_LABELS = ["operator", "number", "class", "type"] as const;
export type TrainLabel = typeof TRAIN_LABELS[number];

// Canonical space-separated tokens keep snapshots stable and CSS selectors simple.
export function parseHiddenTrainLabels(value: unknown): string {
  const tokens = typeof value === "string" ? value.split(/\s+/) : [];
  return TRAIN_LABELS.filter(label => tokens.includes(label)).join(" ");
}

// Restore before paint; unavailable storage leaves every label visible.
export const trainDisplayBootstrap = `(function(){var h="";try{var v=(localStorage.getItem("${TRAIN_DISPLAY_STORAGE_KEY}")||"").split(/\\s+/);h=${JSON.stringify(TRAIN_LABELS)}.filter(function(k){return v.indexOf(k)!==-1}).join(" ")}catch(e){}document.documentElement.dataset.trainLabelsHidden=h})();`;
