import { db } from "./index";
import { vehicles, trains, trainVehicles } from "./schema";

async function importEx355() {
  console.log("Importing Ex 355 Západní expres (2.12.2021, Plzeň–Praha)...");

  const vehicleData = [
    {
      designation: "362",
      operator: "ČD",
      type: "loco" as const,
      classType: null,
      imagePath: "/img/cd-362-n2.gif",
      imageWidth: 169,
      imageHeight: 58,
      notes: "EVN: 91 54 7 362 054-9",
    },
    {
      designation: "Bdmpee 233",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bdmpee233.gif",
      imageWidth: 264,
      imageHeight: 42,
      notes: "80 míst, velkoprostor, 4 kola, klimatizace, 230V, Wi-Fi. EVN: 61 54 20-71 020-9",
    },
    {
      designation: "Bdmpee 233",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bdmpee233.gif",
      imageWidth: 264,
      imageHeight: 42,
      notes: "80 míst, velkoprostor, 4 kola, klimatizace, 230V, Wi-Fi. EVN: 61 54 20-71 038-1",
    },
    {
      designation: "ABbmdz",
      operator: "DLB",
      type: "wagon" as const,
      classType: "1",
      imagePath: "/img/dlb-abbmdz.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "1.+2. třída + bar, 24+6+16 míst kupé, 8 kol, bezbariérový, klimatizace, 230V. DLB (Die Länderbahn)",
    },
    {
      designation: "Bmz",
      operator: "DLB",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/dlb-bmz-alex.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "66 míst, kupé, klimatizace, 230V. DLB (Die Länderbahn), alex livrej",
    },
  ];

  const insertedVehicles = vehicleData.map((v) =>
    db.insert(vehicles).values(v).returning().get()
  );
  console.log(`Inserted ${insertedVehicles.length} vehicles`);

  const train = db
    .insert(trains)
    .values({
      number: "355",
      name: "Západní expres",
      category: "Ex",
      route: "Plzeň hl.n. – Praha hl.n.",
      era: "2021",
      notes: "Skutečné řazení vlaku dne čt 2.12.2021, úsek Plzeň hl.n. – Praha hl.n. Smíšená souprava ČD/DLB.",
    })
    .returning()
    .get();
  console.log(`Inserted train: Ex ${train.number} ${train.name}`);

  const wagonNumbers = ["—", "258", "259", "260", "262"];
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

importEx355();
