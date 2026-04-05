import { db } from "./index";
import { vehicles, trains, trainVehicles } from "./schema";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  db.delete(trainVehicles).run();
  db.delete(trains).run();
  db.delete(vehicles).run();

  // Insert vehicles (physical models)
  const vehicleData = [
    {
      designation: "362",
      operator: "ČD",
      type: "loco" as const,
      classType: null,
      imagePath: "/img/loco-362.gif",
      imageWidth: 169,
      imageHeight: 58,
      notes: "Břeclav – Praha",
    },
    {
      designation: "Amz 61",
      operator: "ÖBB",
      type: "wagon" as const,
      classType: "1",
      imagePath: "/img/amz61.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "54 míst, kupé, klimatizace",
    },
    {
      designation: "WRRmz",
      operator: "ČD",
      type: "wagon" as const,
      classType: "restaurant",
      imagePath: "/img/wrmz.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "30 + 4 bar, klimatizace. Servis zajišťuje JLV",
    },
    {
      designation: "Bmz 61",
      operator: "ÖBB",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/bmz61.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "66 míst, kupé, klimatizace. Odd. 1 služební, 2 pro invalidy, 11 celní orgány",
    },
    {
      designation: "Bmz 61",
      operator: "ÖBB",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/bmz61.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "66 míst, kupé, klimatizace",
    },
    {
      designation: "Bmpz 73",
      operator: "ÖBB",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/bmpz73.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "74 míst, velkoprostor, klimatizace",
    },
    {
      designation: "Bmz 61",
      operator: "ÖBB",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/bmz61.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "66 míst, kupé, klimatizace. Sezónní vůz",
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
      number: "70",
      name: "Antonín Dvořák",
      category: "EC",
      route: "Wien Südbf(Ost) – Břeclav – Praha-Holešovice",
      era: "1998/1999",
      notes: "Plánované řazení v úseku Břeclav – Praha-Holešovice",
    })
    .returning()
    .get();
  console.log(`Inserted train: EC ${train.number} ${train.name}`);

  // Insert train vehicles in order
  const wagonNumbers = ["—", "373", "371", "370", "369", "368", "367"];
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

  console.log("Seed complete!");
}

seed();
