import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth-guards';
import { manufacturerOptions } from '@/lib/model-manufacturers';

export async function modelManufacturerOptions() {
  await requireUser();
  const rows = await db.selectDistinct({ name: schema.vehicles.manufacturer }).from(schema.vehicles).all();
  return manufacturerOptions(rows.map(row => row.name));
}
