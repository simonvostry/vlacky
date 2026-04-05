import { db } from "./index";
import { vehicles, trains, trainVehicles } from "./schema";

async function importRJ55() {
  console.log("Importing RJ 55 Vindobona (30.3.2026)...");

  const vehicleData = [
    {
      designation: "193",
      operator: "ČD",
      type: "loco" as const,
      classType: null,
      imagePath: "/img/cd-193-vectron.gif",
      imageWidth: 190,
      imageHeight: 58,
      notes: "Siemens Vectron. EVN: 91 80 6 193 570-9",
    },
    {
      designation: "Bmpz 893",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bmpz893.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "ČD railjet. 64+10 míst, velkoprostor, 7 kol, dětské kino, klimatizace, 230V, Wi-Fi. EVN: 73 54 20-91 005-2",
    },
    {
      designation: "Bmpz 891",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bmpz891.gif",
      imageWidth: 265,
      imageHeight: 41,
      notes: "ČD railjet. 80 míst, velkoprostor, klimatizace, 230V, Wi-Fi. EVN: 73 54 21-91 105-9",
    },
    {
      designation: "Bmpz 891",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bmpz891.gif",
      imageWidth: 265,
      imageHeight: 41,
      notes: "ČD railjet. 80 míst, velkoprostor, klimatizace, 230V, Wi-Fi. EVN: 73 54 21-91 205-7",
    },
    {
      designation: "Bmpz 891",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bmpz891.gif",
      imageWidth: 265,
      imageHeight: 41,
      notes: "ČD railjet. 80 míst, velkoprostor, klimatizace, 230V, Wi-Fi. EVN: 73 54 21-91 305-5",
    },
    {
      designation: "Bmpz 891",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bmpz891.gif",
      imageWidth: 265,
      imageHeight: 41,
      notes: "ČD railjet. 80 míst, velkoprostor, klimatizace, 230V, Wi-Fi. EVN: 73 54 21-91 405-3",
    },
    {
      designation: "ARbmpz 892",
      operator: "ČD",
      type: "wagon" as const,
      classType: "restaurant",
      imagePath: "/img/cd-arbmpz892.gif",
      imageWidth: 265,
      imageHeight: 41,
      notes: "ČD railjet. 1. třída 6 míst + restaurace 14 míst + 2 invalidní, klimatizace, 230V, Wi-Fi. EVN: 73 54 85-91 005-4",
    },
    {
      designation: "Afmpz 890",
      operator: "ČD",
      type: "wagon" as const,
      classType: "1",
      imagePath: "/img/cd-afmpz890.gif",
      imageWidth: 269,
      imageHeight: 41,
      notes: "ČD railjet. 6 Club + 32 míst 1. třída, klimatizace, 230V, Wi-Fi. EVN: 73 54 80-91 005-9",
    },
  ];

  const insertedVehicles = vehicleData.map((v) =>
    db.insert(vehicles).values(v).returning().get()
  );
  console.log(`Inserted ${insertedVehicles.length} vehicles`);

  const train = db
    .insert(trains)
    .values({
      number: "55",
      name: "Vindobona",
      category: "RJ",
      route: "Praha – Brno – Wien",
      era: "2026",
      notes: "Skutečné řazení vlaku dne po 30.3.2026. ČD railjet.",
    })
    .returning()
    .get();
  console.log(`Inserted train: RJ ${train.number} ${train.name}`);

  const wagonNumbers = ["—", "21", "22", "23", "24", "25", "26", "27"];
  insertedVehicles.forEach((v, i) => {
    db.insert(trainVehicles)
      .values({
        trainId: train.id,
        vehicleId: v.id,
        position: i + 1,
        notes: wagonNumbers[i] !== "—" ? `Číslo vozu: ${wagonNumbers[i]}` : undefined,
      })
      .run();
  });
  console.log(`Inserted ${insertedVehicles.length} train vehicles`);

  console.log("Import complete!");
}

importRJ55();
