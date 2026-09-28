import {wagonConfigurationSnapshot} from '@/lib/wagon-configuration-snapshot';
import {NextResponse} from 'next/server';
import {withWriteTransaction} from '@/db';
import {authorizeApiRequest} from '@/lib/auth-guards';
import {saveVehicle,CollectionError} from '@/lib/wagon-storage';
import {vehiclePieceFields} from '@/lib/vehicle-edit-fields';
import {parseDccConfig} from '@/lib/decoder-config';
import {saveDecoderConfig} from '@/lib/decoder-storage';

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
 const denied=await authorizeApiRequest();if(denied)return denied;
 const rawId=(await params).id,id=Number(rawId);
 if(!/^[1-9]\d*$/.test(rawId)||!Number.isSafeInteger(id))return NextResponse.json({error:'Neplatné vozidlo.'},{status:400});
 let body;
 try{
  const text=await request.text();if(text.length>1_000_000)return NextResponse.json({error:'Konfigurace je příliš velká.'},{status:413});
  body=JSON.parse(text);
  if(!body||typeof body!=='object'||!body.piece||typeof body.piece!=='object'||Array.isArray(body.piece)||Object.keys(body).some(key=>!['piece','decoders'].includes(key))||Object.keys(body.piece).some(key=>!vehiclePieceFields.includes(key as typeof vehiclePieceFields[number])))throw new Error();
  if(body.decoders!==undefined)parseDccConfig({dccAddress:body.piece.dccAddress??null,decoders:body.decoders});
 }catch{return NextResponse.json({error:'Neplatné údaje vozu nebo dekodéru.'},{status:400});}
 try{
  const saved = await withWriteTransaction(async tx=>{
   await saveVehicle({...body.piece,editMode:'piece'},id,tx);
   if(body.decoders!==undefined){
    const vehicle=(await tx.execute({sql:'SELECT dcc_address FROM vehicles WHERE id=?',args:[id]})).rows[0];
    await saveDecoderConfig(id,parseDccConfig({dccAddress:vehicle.dcc_address,decoders:body.decoders}),tx);
   }
   return wagonConfigurationSnapshot(tx,[id]);
  });
  return NextResponse.json({vehicle:saved.pieces[0],decoders:saved.decoders},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  return NextResponse.json({error:error instanceof CollectionError?error.message:'Uložení se nezdařilo. Žádné změny nebyly uloženy.'},{status:error instanceof CollectionError?error.status:409});
 }
}
