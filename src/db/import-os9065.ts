import { db } from "./index";
import { vehicles, trains, trainVehicles } from "./schema";

async function importOs9065() {
  console.log("Importing Os 9065 (25.1.2026, Praha hl.n.)...");

  const vehicleData = [
    {
      designation: "754",
      operator: "ČD",
      type: "loco" as const,
      classType: null,
      imagePath: "/img/cd-754.gif",
      imageWidth: 165,
      imageHeight: 44,
      notes: "EVN: 92 54 2 754 076-8",
    },
    {
      designation: "Bdmteeo 296",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bdmteeo296.gif",
      imageWidth: 268,
      imageHeight: 46,
      notes: "126 míst, velkoprostor, 8 kol, nízkopodlažní, Wi-Fi, 230V, USB 5V. EVN: 50 54 26-18 110-1",
    },
    {
      designation: "Bdmteeo 296",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bdmteeo296.gif",
      imageWidth: 268,
      imageHeight: 46,
      notes: "126 míst, velkoprostor, 8 kol, nízkopodlažní, Wi-Fi, 230V, USB 5V. EVN: 50 54 26-18 147-3",
    },
  ];

  const insertedVehicles = vehicleData.map((v) =>
    db.insert(vehicles).values(v).returning().get()
  );
  console.log(`Inserted ${insertedVehicles.length} vehicles`);

  const train = db
    .insert(trains)
    .values({
      number: "9065",
      name: "",
      category: "Os",
      route: "Praha hl.n.",
      era: "2026",
      notes: "Skutečné řazení vlaku dne ne 25.1.2026 ve stanici Praha hl.n.",
    })
    .returning()
    .get();
  console.log(`Inserted train: Os ${train.number}`);

  insertedVehicles.forEach((v, i) => {
    db.insert(trainVehicles)
      .values({
        trainId: train.id,
        vehicleId: v.id,
        position: i + 1,
      })
      .run();
  });
  console.log(`Inserted ${insertedVehicles.length} train vehicles`);

  console.log("Import complete!");
}

importOs9065();
