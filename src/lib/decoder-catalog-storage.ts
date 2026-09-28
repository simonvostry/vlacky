import type { Transaction } from '@libsql/client';
import { readAtomic, withWriteTransaction } from '@/db';
import { decoderCatalogKey, type DecoderCatalog } from './decoder-catalog';
import type { DecoderConfig } from './decoder-config';

export async function getDecoderCatalog(): Promise<DecoderCatalog> {
  const [makers,models]=await readAtomic(['SELECT id,name FROM decoder_manufacturers ORDER BY name','SELECT id,manufacturer_id,name FROM decoder_models ORDER BY name']);
  return {manufacturers:makers.map(m=>({id:Number(m.id),name:String(m.name)})),models:models.map(m=>({id:Number(m.id),manufacturerId:Number(m.manufacturer_id),name:String(m.name)}))};
}
function name(value: unknown) {
  if(typeof value!=='string'||!value.trim()||value.length>200)throw new Error('Vyplňte název (nejvýše 200 znaků).');
  return value.trim().replace(/\s+/g,' ');
}
async function maker(tx:Transaction, value:string) {
  await tx.execute({sql:'INSERT INTO decoder_manufacturers(name,name_key) VALUES (?,?) ON CONFLICT(name_key) DO NOTHING',args:[value,decoderCatalogKey(value)]});
  return (await tx.execute({sql:'SELECT id,name FROM decoder_manufacturers WHERE name_key=?',args:[decoderCatalogKey(value)]})).rows[0];
}
async function model(tx:Transaction, manufacturerId:number, value:string) {
  await tx.execute({sql:'INSERT INTO decoder_models(manufacturer_id,name,name_key) VALUES (?,?,?) ON CONFLICT(manufacturer_id,name_key) DO NOTHING',args:[manufacturerId,value,decoderCatalogKey(value)]});
  return (await tx.execute({sql:'SELECT id,name FROM decoder_models WHERE manufacturer_id=? AND name_key=?',args:[manufacturerId,decoderCatalogKey(value)]})).rows[0];
}
export async function addDecoderCatalogEntry(body: Record<string,unknown>) {
  const value=name(body.name);
  return withWriteTransaction(async tx=>{
    if(body.kind==='manufacturer')return {id:Number((await maker(tx,value)).id)};
    if(body.kind!=='model'||!Number.isSafeInteger(body.manufacturerId)||Number(body.manufacturerId)<1)throw new Error('Vyberte výrobce dekodéru.');
    const id=Number(body.manufacturerId);
    if(!(await tx.execute({sql:'SELECT id FROM decoder_manufacturers WHERE id=?',args:[id]})).rows.length)throw new Error('Výrobce neexistuje.');
    return {id:Number((await model(tx,id,value)).id)};
  });
}
/** Resolve references inside the same transaction as the installed configuration save.
 * Legacy clients may still send text: register it without splitting normalized names. */
export async function resolveDecoderModel(tx:Transaction,d:DecoderConfig): Promise<DecoderConfig> {
  if(d.catalogModelId != null){
    const row=(await tx.execute({sql:'SELECT m.id,m.name,p.name AS manufacturer FROM decoder_models m JOIN decoder_manufacturers p ON p.id=m.manufacturer_id WHERE m.id=?',args:[d.catalogModelId]})).rows[0];
    if(!row)throw new Error('Model dekodéru neexistuje.');
    return {...d,model:String(row.name),manufacturer:String(row.manufacturer)};
  }
  if(!d.manufacturer.trim())return {...d,catalogModelId:null};
  const manufacturer=await maker(tx,name(d.manufacturer));
  if(!d.model.trim())return {...d,catalogModelId:null,manufacturer:String(manufacturer.name)};
  const item=await model(tx,Number(manufacturer.id),name(d.model));
  return {...d,catalogModelId:Number(item.id),manufacturer:String(manufacturer.name),model:String(item.name)};
}
