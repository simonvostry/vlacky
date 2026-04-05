import { db } from "./index";
import { vehicles, trains, trainVehicles } from "./schema";

async function importSp1641() {
  console.log("Importing Sp 1641 Ondráš (2002, sobotní varianta)...");

  const vehicleData = [
    {
      designation: "754",
      operator: "ČD",
      type: "loco" as const,
      classType: null,
      imagePath: "/img/cd-754.gif",
      imageWidth: 165,
      imageHeight: 44,
      notes: "Kojetín – Ostrava (od 5.XI.01, dříve 750 na trase Brno – Kojetín – Ostrava)",
    },
    {
      designation: "Bdmtee",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bdmtee.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "96 míst, velkoprostor, kola. (Brno –) Kojetín – Ostrava",
    },
    {
      designation: "Bdmtee",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bdmtee.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "96 míst, velkoprostor, kola. (Brno –) Kojetín – Ostrava",
    },
    {
      designation: "BDs",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bds.gif",
      imageWidth: 245,
      imageHeight: 42,
      notes: "40 míst, kupé + zavazadlový oddíl. (Brno –) Kojetín – Ostrava",
    },
    {
      designation: "Bdmtee",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bdmtee.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "96 míst, velkoprostor, kola. (Brno –) Kojetín – Ostrava",
    },
    {
      designation: "Bdmtee",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bdmtee.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "96 míst, velkoprostor, kola. (Brno –) Kojetín – Ostrava",
    },
  ];

  const insertedVehicles = vehicleData.map((v) =>
    db.insert(vehicles).values(v).returning().get()
  );
  console.log(`Inserted ${insertedVehicles.length} vehicles`);

  const train = db
    .insert(trains)
    .values({
      number: "1641",
      name: "Ondráš",
      category: "Sp",
      route: "(Brno –) Kojetín – Ostrava",
      era: "2002",
      notes: "Plánované řazení, varianta v ⑥ (sobota). 10.6.2001 – 14.12.2002.",
    })
    .returning()
    .get();
  console.log(`Inserted train: Sp ${train.number} ${train.name}`);

  const wagonNumbers = ["—", "11", "12", "13", "14", "15"];
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

importSp1641();
