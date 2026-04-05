import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  designation: text("designation").notNull(), // "362", "Amz 61", "Bmz 61"
  operator: text("operator"), // "ČD", "ÖBB"
  type: text("type").notNull(), // "loco" | "wagon"
  classType: text("class_type"), // "1" | "2" | "restaurant" | null
  imagePath: text("image_path"), // "/img/loco-362.gif"
  imageWidth: integer("image_width"), // px
  imageHeight: integer("image_height"), // px
  manufacturer: text("manufacturer"), // "Roco", "ACME"
  catalogNumber: text("catalog_number"), // "73219"
  dccAddress: integer("dcc_address"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const trains = sqliteTable("trains", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number"), // "70"
  name: text("name"), // "Antonín Dvořák"
  category: text("category"), // "EC", "IC", "R", "Os"
  route: text("route"), // "Wien Südbf – Praha-Holešovice"
  era: text("era"), // "1998/1999"
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const trainVehicles = sqliteTable("train_vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trainId: integer("train_id")
    .notNull()
    .references(() => trains.id, { onDelete: "cascade" }),
  vehicleId: integer("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  position: integer("position").notNull(), // 1-based order
  dccAddressOverride: integer("dcc_address_override"),
  lightingDecoderAddress: integer("lighting_decoder_address"),
  notes: text("notes"),
});

export const decoderFunctions = sqliteTable("decoder_functions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  functionNumber: integer("function_number").notNull(), // 0–28
  label: text("label").notNull(), // "Světla", "Interiér"
  description: text("description"),
});
