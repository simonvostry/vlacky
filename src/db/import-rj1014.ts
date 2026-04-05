import { db } from "./index";
import { vehicles, trains, trainVehicles } from "./schema";

async function importRJ1014() {
  console.log("Importing RJ 1014 RegioJet (23.1.2026)...");

  // Insert vehicles
  const vehicleData = [
    {
      designation: "388.2",
      operator: "RJ",
      type: "loco" as const,
      classType: null,
      imagePath: "/img/rj-388.gif",
      imageWidth: 189,
      imageHeight: 58,
      notes: "EVN: 91 81 1388 221-4",
    },
    {
      designation: "Bpmz 294",
      operator: "RJ",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/rj-bpmz294.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "Bp200 / Bp275. 80 míst, velkoprostor, klimatizace, 230V, Wi-Fi. EVN: 61 80 20-91 317-3",
    },
    {
      designation: "Bmpz",
      operator: "RJ",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/rj-bmpz2090.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "Bm000 / Bm012. 80 míst, velkoprostor, klimatizace, zábavní portál, 230V, Wi-Fi. EVN: 61 81 20-90 012-0",
    },
    {
      designation: "Bmz",
      operator: "RJ",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/rj-bmz2190.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "Bk100 / Bk137. 36 míst kupé + 6 dětský koutek, bezbariérový, klimatizace, 230V, Wi-Fi. EVN: 61 81 21-90 037-6",
    },
    {
      designation: "Ampz",
      operator: "RJ",
      type: "wagon" as const,
      classType: "1",
      imagePath: "/img/rj-ampz1895.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "A100 / A140. 16 míst kupé + 32 velkoprostor, klimatizace, 230V, Wi-Fi. EVN: 61 81 18-95 040-0",
    },
    {
      designation: "Ampz",
      operator: "RJ",
      type: "wagon" as const,
      classType: "1",
      imagePath: "/img/rj-ampz1895.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "As100. 16 míst kupé + 32 velkoprostor, klimatizace, 230V, Wi-Fi. EVN: 61 81 18-91 026-3",
    },
    {
      designation: "ABmz",
      operator: "RJ",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/rj-abmz3090.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "AB000 / AB035. 24+18 míst kupé + dětský koutek, klimatizace, 230V, Wi-Fi. EVN: 61 81 30-90 035-9",
    },
  ];

  const insertedVehicles = vehicleData.map((v) =>
    db.insert(vehicles).values(v).returning().get()
  );
  console.log(`Inserted ${insertedVehicles.length} vehicles`);

  // Insert train
  const train = db
    .insert(trains)
    .values({
      number: "1014",
      name: "RegioJet",
      category: "RJ",
      route: "Praha – Brno (skutečné řazení 23.1.2026)",
      era: "2026",
      notes: "Skutečné řazení vlaku dne pá 23.1.2026. Původní číslo: RJ 14022/3 (RJPL).",
    })
    .returning()
    .get();
  console.log(`Inserted train: RJ ${train.number} ${train.name}`);

  // Insert train vehicles in order
  insertedVehicles.forEach((v, i) => {
    db.insert(trainVehicles)
      .values({
        trainId: train.id,
        vehicleId: v.id,
        position: i + 1,
        notes: i === 0 ? undefined : `Pozice ${i}`,
      })
      .run();
  });
  console.log(`Inserted ${insertedVehicles.length} train vehicles`);

  console.log("Import complete!");
}

importRJ1014();
