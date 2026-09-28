'use client';
import { useState } from 'react';
import { FilterDropdown } from './filter-dropdown';
import { decoderCatalogKey, type DecoderCatalog } from '@/lib/decoder-catalog';
import type { DecoderConfig } from '@/lib/decoder-config';

type Props={decoder:DecoderConfig;catalog:DecoderCatalog;disabled:boolean;onChange:(patch:Partial<DecoderConfig>)=>void;onCatalog:(catalog:DecoderCatalog)=>void;onBusy:(busy:boolean)=>void};
export function DecoderModelPicker({decoder:d,catalog,disabled,onChange,onCatalog,onBusy}:Props){
 const [adding,setAdding]=useState<'manufacturer'|'model'|null>(null),[name,setName]=useState(''),[error,setError]=useState('');
 const maker=catalog.manufacturers.find(m=>decoderCatalogKey(m.name)===decoderCatalogKey(d.manufacturer));
 const models=catalog.models.filter(m=>m.manufacturerId===maker?.id);
 const selected=models.find(m=>m.id===d.catalogModelId)||models.find(m=>decoderCatalogKey(m.name)===decoderCatalogKey(d.model));
 const makers=catalog.manufacturers.map(m=>({value:m.name,label:m.name}));
 if(d.manufacturer&&!maker)makers.push({value:d.manufacturer,label:d.manufacturer});
 const options=models.map(m=>({value:String(m.id),label:m.name}));
 if(d.model&&!selected)options.push({value:'legacy',label:d.model});
 async function add(){
  setError('');onBusy(true);
  try{
   const response=await fetch('/api/dekodery/katalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:adding,name,manufacturerId:maker?.id})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Uložení se nezdařilo.');
   const refreshed=await fetch('/api/dekodery/katalog');if(!refreshed.ok)throw new Error('Seznam se nepodařilo načíst. Zkuste to znovu.');
   const next:DecoderCatalog=await refreshed.json();onCatalog(next);
   if(adding==='manufacturer')onChange({manufacturer:next.manufacturers.find(m=>m.id===result.id)!.name,model:'',catalogModelId:null});
   else onChange({model:next.models.find(m=>m.id===result.id)!.name,catalogModelId:result.id});
   setAdding(null);setName('');
  }catch(e){setError(e instanceof Error?e.message:'Uložení se nezdařilo.');}finally{onBusy(false);}
 }
 return <div className="space-y-3">
  <div className="grid min-w-0 gap-3 @sm:grid-cols-2">
   <div><p className="mb-1 text-sm font-medium text-secondary">Výrobce dekodéru</p><FilterDropdown label="Výrobce dekodéru" emptyLabel="Nevyplněn" value={maker?.name??d.manufacturer} disabled={disabled} className="w-full" options={[...makers,{value:'__new',label:'+ Přidat výrobce'}]} onChange={value=>{if(value==='__new'){setAdding('manufacturer');setName('');setError('');}else{onChange({manufacturer:value,model:'',catalogModelId:null});setAdding(null);}}}/></div>
   <div><p className="mb-1 text-sm font-medium text-secondary">Model dekodéru</p><FilterDropdown label="Model dekodéru" emptyLabel="Nevyplněn" value={selected?String(selected.id):d.model?'legacy':''} disabled={disabled||!maker} className="w-full" options={[...options,...(maker?[{value:'__new',label:'+ Přidat model'}]:[])]} onChange={value=>{if(value==='__new'){setAdding('model');setName('');setError('');}else{const model=models.find(m=>m.id===Number(value));onChange({model:model?.name??'',catalogModelId:model?.id??null});setAdding(null);}}}/></div>
  </div>
  {adding&&<div className="rounded-md bg-subtle p-3">
   <label className="block text-sm">{adding==='manufacturer'?'Nový výrobce dekodéru':'Nový model dekodéru'}<input autoFocus maxLength={200} disabled={disabled} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(name.trim()&&!disabled)void add();}}} className="mt-1 w-full rounded-md border border-control bg-surface px-2 py-1.5"/></label>
   <div className="mt-2 flex gap-2"><button type="button" disabled={disabled||!name.trim()} className="ui-button ui-button-secondary" onClick={()=>void add()}>Přidat do seznamu</button><button type="button" disabled={disabled} className="ui-button ui-button-quiet" onClick={()=>setAdding(null)}>Zrušit přidání</button></div>
   {error&&<p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
  </div>}
 </div>;
}
