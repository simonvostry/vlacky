"use client";

import { ThemeChoices } from "./theme-toggle";
import { GallerySizeControls } from "./gallery-size-controls";
import { TrainDisplayControls } from "./train-display-controls";

/** Always mounted inside the account panel so preferences synchronize while closed. */
export function DisplaySettings({ vehicleLabels, gallery }: { vehicleLabels: boolean; gallery: boolean }) {
  return <>
    {gallery && <p className="mb-2 text-sm font-medium">Velikost obrázků</p>}
    <GallerySizeControls visible={gallery} />
    {vehicleLabels && <p className={`${gallery ? "mt-4" : ""} mb-2 text-sm font-medium`}>Údaje u vozidel</p>}
    <TrainDisplayControls visible={vehicleLabels} />
    <div className={vehicleLabels || gallery ? "mt-4 border-t border-divider pt-4" : ""}>
      <p className="mb-2 text-sm font-medium">Vzhled</p>
      <ThemeChoices />
    </div>
  </>;
}
