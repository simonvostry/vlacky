import { ClassBadge } from "./class-badge";

const operatorLogos: Record<string, string> = {
  "ČD": "/img/logo-cd.svg",
  "ÖBB": "/img/logo-obb.svg",
};

type Vehicle = {
  id: number;
  designation: string;
  operator: string | null;
  type: string;
  classType: string | null;
  imagePath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
};

type TrainVehicle = {
  position: number;
  notes: string | null;
  dccAddressOverride: number | null;
  lightingDecoderAddress: number | null;
  vehicle: Vehicle;
};

type Props = {
  vehicles: TrainVehicle[];
};

// Display at 75% native size — compromise between sharpness and readability
const SCALE = 0.75;

export function TrainComposition({ vehicles }: Props) {
  if (vehicles.length === 0) {
    return (
      <p className="py-8 text-center text-gray-400">
        Žádná vozidla v soupravě
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {/* Train images */}
      <div className="pb-2">
        <div className="flex items-end" style={{ gap: 0 }}>
          {vehicles.map((tv) => {
            const nw = tv.vehicle.imageWidth || (tv.vehicle.type === "loco" ? 169 : 264);
            const nh = tv.vehicle.imageHeight || (tv.vehicle.type === "loco" ? 58 : 41);
            const w = Math.round(nw * SCALE);
            const h = Math.round(nh * SCALE);
            return (
              <div key={tv.position} className="shrink-0" style={{ width: w }}>
                {tv.vehicle.imagePath ? (
                  <img
                    src={tv.vehicle.imagePath}
                    alt={`${tv.vehicle.operator} ${tv.vehicle.designation}`}
                    width={nw}
                    height={nh}
                    className="block"
                    style={{ width: w, height: h }}
                  />
                ) : (
                  <div
                    className="flex items-end justify-center bg-gray-200 text-[8px] text-gray-500"
                    style={{ width: w, height: h }}
                  >
                    {tv.vehicle.designation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Rail line */}
        <div className="h-px bg-gray-400" />

        {/* Vehicle details */}
        <div className="flex" style={{ gap: 0 }}>
          {vehicles.map((tv) => {
            const nw = tv.vehicle.imageWidth || (tv.vehicle.type === "loco" ? 169 : 264);
            const w = Math.round(nw * SCALE);
            return (
              <div
                key={tv.position}
                className="shrink-0 pt-1 flex items-center justify-center gap-1 whitespace-nowrap overflow-hidden"
                style={{ width: w }}
              >
                {tv.vehicle.operator && operatorLogos[tv.vehicle.operator] ? (
                  <img
                    src={operatorLogos[tv.vehicle.operator]}
                    alt={tv.vehicle.operator}
                    className="shrink-0"
                    style={{ height: 14, width: "auto" }}
                  />
                ) : (
                  <span className="text-[13px] leading-none text-gray-400">{tv.vehicle.operator}</span>
                )}
                {tv.vehicle.classType && (
                  <ClassBadge classType={tv.vehicle.classType} size="xs" short />
                )}
                <span className="text-[13px] leading-none font-bold text-gray-800">{tv.vehicle.designation}</span>
                {tv.notes && (
                  <span className="text-[13px] leading-none text-gray-400">
                    {tv.notes.replace(/^Číslo vozu:\s*/, "")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
