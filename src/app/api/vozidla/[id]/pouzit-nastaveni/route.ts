import { NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/auth-guards';
import { applyWagonSettings, CollectionError } from '@/lib/wagon-storage';

export async function POST(request: Request, {params}: {params: Promise<{id:string}>}) {
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const rawId = (await params).id;
  if (!/^[1-9]\d*$/.test(rawId)) return NextResponse.json({error:'Neplatné vozidlo.'},{status:400});
  const body = await request.json().catch(()=>null);
  try {
    const saved = await applyWagonSettings(Number(rawId),body);
    return NextResponse.json(saved,{headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    return NextResponse.json({error:error instanceof CollectionError ? error.message : 'Přenos nastavení se nepodařilo dokončit. Obnovte stránku a zkontrolujte vozy.'},{status:error instanceof CollectionError ? error.status : 409});
  }
}
