import { NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/auth-guards';
import { addDecoderCatalogEntry, getDecoderCatalog } from '@/lib/decoder-catalog-storage';
export async function GET() {
 const denied=await authorizeApiRequest();if(denied)return denied;
 return NextResponse.json(await getDecoderCatalog());
}
export async function POST(request:Request) {
 const denied=await authorizeApiRequest();if(denied)return denied;
 try {
  const body=await request.json();if(!body||typeof body!=='object')throw new Error('Neplatné údaje.');
  return NextResponse.json(await addDecoderCatalogEntry(body),{status:201});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Nelze uložit položku.'},{status:400});}
}
