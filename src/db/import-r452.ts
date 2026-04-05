import { db } from "./index";
import { vehicles, trains, trainVehicles } from "./schema";

async function importR452() {
  console.log("Importing R 452 (2007, Praha–Plzeň–Nürnberg)...");

  const vehicleData = [
    {
      designation: "363",
      operator: "ČD",
      type: "loco" as const,
      classType: null,
      imagePath: "/img/cd-362-z.gif",
      imageWidth: 169,
      imageHeight: 58,
      notes: "Praha hl.n. – Plzeň hl.n. (v úseku Plzeň–Furth im Wald lok. 754). PJ Plzeň",
    },
    {
      designation: "Aimz 541",
      operator: "DB",
      type: "wagon" as const,
      classType: "1",
      imagePath: "/img/db-aimz541.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "25 míst kupé + 25 velkoprostor. Praha hl.n. – Plzeň hl.n. – Nürnberg Hbf",
    },
    {
      designation: "Bimz 548",
      operator: "DB",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/db-bimz548.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "25 míst kupé + 32+6 velkoprostor. Odd. 1 služební, odd. 2 pasové orgány (Domažlice–Furth im Wald). Praha–Nürnberg",
    },
    {
      designation: "Bimz 548",
      operator: "DB",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/db-bimz548.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "25 míst kupé + 32+6 velkoprostor. Praha hl.n. – Plzeň hl.n. – Nürnberg Hbf",
    },
    {
      designation: "Bimz 548",
      operator: "DB",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/db-bimz548.gif",
      imageWidth: 264,
      imageHeight: 41,
      notes: "25 míst kupé + 32+6 velkoprostor. Praha hl.n. – Plzeň hl.n. – Nürnberg Hbf",
    },
    {
      designation: "Bmee",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bmee.gif",
      imageWidth: 264,
      imageHeight: 40,
      notes: "66 míst, kupé. Praha hl.n. – Plzeň hl.n. Jede podle potřeby. DST České Budějovice",
    },
    {
      designation: "Bmee",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bmee.gif",
      imageWidth: 264,
      imageHeight: 40,
      notes: "66 míst, kupé. Praha hl.n. – Plzeň hl.n. Jede podle potřeby. DST České Budějovice",
    },
    {
      designation: "Bmee",
      operator: "ČD",
      type: "wagon" as const,
      classType: "2",
      imagePath: "/img/cd-bmee.gif",
      imageWidth: 264,
      imageHeight: 40,
      notes: "66 míst, kupé. Praha hl.n. – Plzeň hl.n. DST České Budějovice",
    },
  ];

  const insertedVehicles = vehicleData.map((v) =>
    db.insert(vehicles).values(v).returning().get()
  );
  console.log(`Inserted ${insertedVehicles.length} vehicles`);

  const train = db
    .insert(trains)
    .values({
      number: "452",
      name: "",
      category: "R",
      route: "Praha hl.n. – Plzeň hl.n. – Nürnberg Hbf",
      era: "2007",
      notes: "Plánované řazení 2007. Smíšená souprava ČD/DB. V úseku Plzeň–Furth im Wald lok. 754.",
    })
    .returning()
    .get();
  console.log(`Inserted train: R ${train.number}`);

  const wagonNumbers = ["—", "11", "12", "13", "14", "3", "4", "5"];
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

importR452();
