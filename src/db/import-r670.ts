import { db } from "./index";
import { vehicles, trains, trainVehicles } from "./schema";

async function importR670() {
  console.log("Importing R 670 Labe (5.2./6.2.2026, Bohušovice–Děčín)...");

  const vehicle = db
    .insert(vehicles)
    .values({
      designation: "642",
      operator: "ČD",
      type: "loco" as const,
      classType: null,
      imagePath: "/img/cd-642-desiro.gif",
      imageWidth: 415,
      imageHeight: 39,
      notes: "Desiro. 1.+2. třída, 8+102+11 míst, velkoprostor, nízkopodlažní, klimatizace, Wi-Fi, 230V, USB 5V. EVN: 95 80 0 642 404-7",
    })
    .returning()
    .get();
  console.log(`Inserted vehicle: ${vehicle.designation}`);

  const train = db
    .insert(trains)
    .values({
      number: "670",
      name: "Labe",
      category: "R",
      route: "Bohušovice nad Ohří – Děčín hl.n.",
      era: "2026",
      notes: "Skutečné řazení vlaku dne čt 5.2. / pá 6.2.2026. Jednotka Desiro.",
    })
    .returning()
    .get();
  console.log(`Inserted train: R ${train.number} ${train.name}`);

  db.insert(trainVehicles)
    .values({
      trainId: train.id,
      vehicleId: vehicle.id,
      position: 1,
    })
    .run();
  console.log("Inserted 1 train vehicle");

  console.log("Import complete!");
}

importR670();
