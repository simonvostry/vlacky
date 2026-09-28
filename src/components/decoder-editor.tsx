"use client";
import { InlineDelete } from './inline-delete';
import { DecoderModelPicker } from './decoder-model-picker';
import type { DecoderCatalog } from '@/lib/decoder-catalog';


import { EditAction } from "@/components/ui-actions";
import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { blankDecoder, categoryLabels, functionLabel, type DecoderConfig, type VehicleDccConfig } from "@/lib/decoder-config";

const input = "w-full min-w-0 rounded-md border border-control bg-surface px-2 py-1.5 text-sm";
const button = "ui-button ui-button-secondary";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 text-sm font-medium text-secondary"><span className="mb-1 block">{label}</span>{children}</label>;
}
function NumberField({ label, value, onChange, min = 0, max = 255, required = false }: { label: string; value: number | null; onChange: (n: number | null) => void; min?: number; max?: number; required?: boolean }) {
  return <Field label={label}><input className={input} type="number" min={min} max={max} step={1} required={required} value={value !== null && Number.isFinite(value) ? value : ""} onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))} /></Field>;
}

export function DecoderEditor({ vehicleId, initial, templates, compact = false, onEditingChange, onSaved, label = "Vůz" }: {
  label?: string; compact?: boolean; onEditingChange?: (editing: boolean) => void; onSaved?: (config: VehicleDccConfig) => void;
  vehicleId: number; initial: VehicleDccConfig; templates: { label: string; decoder: DecoderConfig }[];
}) {
  const router = useRouter();
  const [config, setConfig] = useState(initial);
  const [editing, setEditingState] = useState(false);
  function setEditing(value: boolean) { setEditingState(value); onEditingChange?.(value); }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [previousInitial, setPreviousInitial] = useState(initial);
  if (initial !== previousInitial) {
    setPreviousInitial(initial);
    // Inline piece saves refresh this section. Preserve an open decoder draft,
    // but follow the piece address unless the user explicitly edited that field.
    setConfig(current => !editing ? initial : {
      ...current,
      dccAddress: current.dccAddress === previousInitial.dccAddress ? initial.dccAddress : current.dccAddress,
    });
  }
  function add() { setConfig(c=>({...c,decoders:[...c.decoders,blankDecoder()]})); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setSaved(false);
    try {
      const response = await fetch(`/api/vozidla/${vehicleId}/dekodery`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Uložení se nezdařilo.");
      setConfig(data); setEditing(false); setSaved(true);
      if (onSaved) onSaved(data); else router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Uložení se nezdařilo."); }
    finally { setBusy(false); }
  }
  return <section id={compact ? `dekodery-${vehicleId}` : "dekodery"} aria-label={compact ? `Dekodér: ${label}` : undefined} className={compact ? "edit-reveal-scope @container mt-3" : "config-section @container mt-6"}>
    {(!compact || config.decoders.length > 0) && <header className="flex items-center justify-between gap-3 border-b border-divider pb-4">
      <h2 className="font-semibold">{compact ? "Nastavení dekodéru" : "Dekodéry a DCC funkce"}</h2>
      {!editing && <span className={compact ? "edit-reveal" : ""}><EditAction label={compact ? `Upravit dekodér: ${label}` : "Upravit DCC"} onClick={() => { setEditing(true); setSaved(false); setError(""); }} /></span>}
    </header>}
    {saved && <p role="status" className="px-4 pt-3 text-sm text-success">Konfigurace uložena.</p>}
    {!editing ? <div className="space-y-4 pt-5">
      {!compact && <p className="text-sm text-secondary">DCC adresa: <strong className="font-mono text-foreground">{config.dccAddress ?? "nevyplněna"}</strong></p>}
      {!config.decoders.length && <div className="space-y-3"><p className="text-sm text-secondary">Podrobnosti dekodéru nejsou vyplněné.</p><button type="button" className="ui-button ui-button-quiet" onClick={() => { setEditing(true); setSaved(false); setError(""); add(); }}>Doplnit údaje</button></div>}
      {config.decoders.map((d, index) => <article key={d.id} className="rounded-lg bg-subtle p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-semibold">{[d.manufacturer, d.model].filter(Boolean).join(" · ") || (config.decoders.length > 1 ? `Dekodér ${index + 1}` : "Dekodér")}</h3>{(!compact || (d.address !== null && d.address !== config.dccAddress)) && <span className="text-xs text-secondary">DCC {d.address ?? config.dccAddress ?? "—"}</span>}</div>
        {!!d.functions.length && <dl className="mt-3 divide-y divide-divider">
          {d.functions.map(f => <div key={f.functionNumber} className="flex gap-3 py-1.5 text-xs"><dt className="w-8 shrink-0 font-mono font-bold">F{f.functionNumber}</dt><dd className="min-w-0 flex-1"><span className="font-medium">{functionLabel(f)}</span><span className="ml-2 text-[10px] text-secondary">{f.label.trim() && f.label.trim() !== categoryLabels[f.category] ? `${categoryLabels[f.category]} · ` : ""}{f.behavior === "momentary" ? "Podržet" : "Přepínač"}</span>{f.description && <p className="mt-0.5 whitespace-pre-wrap text-secondary">{f.description}</p>}</dd></div>)}
        </dl>}
        {!d.functions.length && <p className="mt-2 text-xs text-secondary">Funkce zatím nejsou vyplněny.</p>}
        {!!d.cvs.length && <details className="mt-3 text-xs" data-decoder-advanced><summary className="cursor-pointer font-medium">Pokročilé nastavení</summary><h4 className="mt-3 font-medium">CV záznamy ({d.cvs.length})</h4><ul className="mt-2 space-y-1">{d.cvs.map(c => <li key={`${c.number}:${c.cv31}:${c.cv32}`}><strong className="font-mono">CV{c.number} = {c.value}</strong>{c.cv31 !== null && <span className="text-secondary"> (CV31 {c.cv31}, CV32 {c.cv32})</span>}{c.note && <span> · {c.note}</span>}</li>)}</ul></details>}
      </article>)}
    </div> : <form onSubmit={save} className="p-4">
      <DecoderFields config={config} onChange={setConfig} templates={templates} disabled={busy} onBusyChange={setBusy} showAddress={!compact} />
      <fieldset disabled={busy}>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2 border-t border-divider pt-4"><button type="submit" className="ui-button ui-button-primary">{busy ? "Ukládání…" : "Uložit změny"}</button><button type="button" className="ui-button ui-button-quiet" onClick={() => { setConfig(initial); setEditing(false); setError(""); }}>Zrušit</button></div>
      </fieldset>
    </form>}
  </section>;
}

export function DecoderFields({config,onChange,templates,disabled=false,onBusyChange,showAddress=false}:{config:VehicleDccConfig;onChange:(value:VehicleDccConfig)=>void;templates:{label:string;decoder:DecoderConfig}[];disabled?:boolean;onBusyChange?:(busy:boolean)=>void;showAddress?:boolean}) {
  const [catalog,setCatalog]=useState<DecoderCatalog|null>(null);
  const [catalogError,setCatalogError]=useState('');
  const [catalogRetry,setCatalogRetry]=useState(0);
  const [templateId,setTemplateId]=useState('');
  const [catalogBusy,setCatalogBusy]=useState(false);
  const busy=disabled||catalogBusy;
  function setBusy(value:boolean){setCatalogBusy(value);onBusyChange?.(value);}
  function setConfig(update:(current:VehicleDccConfig)=>VehicleDccConfig){onChange(update(config));}
  useEffect(()=>{
    if(catalog)return;
    let cancelled=false;
    fetch('/api/dekodery/katalog').then(async response=>{
      if(!response.ok)throw new Error('Seznam dekodérů se nepodařilo načíst.');
      const value=await response.json();if(!cancelled){setCatalog(value);setCatalogError('');}
    }).catch(error=>{if(!cancelled)setCatalogError(error.message);});
    return ()=>{cancelled=true;};
  },[catalog,catalogRetry]);
  function update(id: string, patch: Partial<DecoderConfig>) {
    setConfig(c => ({ ...c, decoders: c.decoders.map(d => d.id === id ? { ...d, ...patch } : d) }));
  }
  function add(template?: DecoderConfig) {
    const decoder = template ? { ...structuredClone(template), id: crypto.randomUUID(), address: null } : blankDecoder();
    setConfig(c => ({ ...c, decoders: [...c.decoders, decoder] }));
    setTemplateId("");
  }
  return <div className="@container">
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
        {showAddress && <div className="max-w-xs"><NumberField label="DCC adresa" value={config.dccAddress} min={1} max={10239} onChange={dccAddress => setConfig(c => ({ ...c, dccAddress }))} /></div>}
        <p className="text-xs text-secondary">Dekodér používá DCC adresu vozidla. Více vozů může mít stejnou adresu i funkci osvětlení.</p>
        {config.decoders.map((d, index) => <article key={d.id} className="space-y-4 rounded-lg border border-divider p-3">
          <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Dekodér {index + 1}</h3><InlineDelete className="text-xs text-danger" disabled={busy} question={`Odebrat dekodér ${index + 1} a jeho funkce? Změna se projeví po uložení.`} onConfirm={() => setConfig(c => ({ ...c, decoders: c.decoders.filter(x => x.id !== d.id) }))}>Odebrat dekodér</InlineDelete></div>
          {catalog ? <DecoderModelPicker decoder={d} catalog={catalog} disabled={busy} onBusy={setBusy} onCatalog={setCatalog} onChange={patch=>update(d.id,patch)} /> : <div className="text-sm text-secondary">{catalogError||'Načítání seznamu dekodérů…'}{catalogError&&<button type="button" className="ui-button ui-button-quiet" onClick={()=>setCatalogRetry(n=>n+1)}>Zkusit znovu</button>}</div>}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold">Funkce</h4>
            {d.functions.map((f, i) => <div key={i} className="rounded-md bg-subtle p-2">
              <div className="grid grid-cols-2 items-end gap-2 @2xl:grid-cols-[64px_1fr_100px_105px_auto]">
                <NumberField label="F číslo" min={0} max={128} required value={f.functionNumber} onChange={n => update(d.id, { functions: d.functions.map((x, j) => j === i ? { ...x, functionNumber: n ?? NaN } : x) })} />
                <Field label="Vlastní název (volitelný)"><input placeholder={categoryLabels[f.category]} maxLength={150} className={input} value={f.label} onChange={e => update(d.id, { functions: d.functions.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} /></Field>
                <Field label="Kategorie"><select className={input} value={f.category} onChange={e => update(d.id, { functions: d.functions.map((x, j) => j === i ? { ...x, category: e.target.value as typeof f.category } : x) })}>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
                <Field label="Ovládání"><select className={input} value={f.behavior} onChange={e => update(d.id, { functions: d.functions.map((x, j) => j === i ? { ...x, behavior: e.target.value as typeof f.behavior } : x) })}><option value="toggle">Přepínač</option><option value="momentary">Podržet</option></select></Field>
                <button type="button" className="p-2 text-xs text-danger" aria-label={`Odebrat funkci F${f.functionNumber}`} onClick={() => update(d.id, { functions: d.functions.filter((_, j) => j !== i) })}>×</button>
              </div>
              <div className="mt-2"><Field label="Popis funkce"><input maxLength={1000} className={input} placeholder="Např. pouze čelní světla ve směru jízdy" value={f.description} onChange={e => update(d.id, { functions: d.functions.map((x, j) => j === i ? { ...x, description: e.target.value } : x) })} /></Field></div>
            </div>)}
            <button type="button" className={button} disabled={d.functions.length >= 129} onClick={() => { const number = Array.from({ length: 129 }, (_, i) => i).find(n => !d.functions.some(f => f.functionNumber === n))!; update(d.id, { functions: [...d.functions, { functionNumber: number, label: "", category: "other", behavior: "toggle", description: "" }] }); }}>+ Přidat funkci</button>
          </div>
          <details className="text-xs" data-decoder-advanced><summary className="cursor-pointer font-semibold">Pokročilé nastavení</summary>
            <div className="mt-3 space-y-3">
          {d.address !== null && <details className="rounded-md bg-subtle p-3 text-xs">
            <summary className="cursor-pointer font-medium">Samostatná adresa dekodéru: {d.address}</summary>
            <p className="my-2 text-secondary">Tento uložený dekodér má vlastní adresu místo adresy vozidla. Vyprázdněním pole začne používat adresu vozidla.</p>
            <div className="max-w-xs"><NumberField label="Samostatná adresa dekodéru" value={d.address} min={1} max={10239} onChange={address => update(d.id, { address })} /></div>
          </details>}
          <details><summary className="cursor-pointer font-semibold">CV záznamy ({d.cvs.length})</summary>
            <p className="my-2 text-secondary">Zapište hodnoty podle manuálu. U indexovaných CV doplňte také CV31 a CV32.</p>
            <div className="space-y-2">{d.cvs.map((c, i) => <div key={i} className="rounded-md bg-subtle p-2">
              <div className="grid grid-cols-2 gap-2 @sm:grid-cols-4">{([['number', 'CV číslo', 1, 1024], ['value', 'Hodnota', 0, 255], ['cv31', 'Index CV31', 0, 255], ['cv32', 'Index CV32', 0, 255]] as const).map(([key, label, min, max]) => <NumberField key={key} label={label} min={min} max={max} required={key === 'number' || key === 'value'} value={c[key]} onChange={n => update(d.id, { cvs: d.cvs.map((x, j) => j === i ? { ...x, [key]: n === null && (key === 'number' || key === 'value') ? NaN : n } : x) })} />)}</div>
              <div className="mt-2 flex items-end gap-2"><div className="flex-1"><Field label="Poznámka k CV"><input maxLength={1000} className={input} value={c.note} onChange={e => update(d.id, { cvs: d.cvs.map((x, j) => j === i ? { ...x, note: e.target.value } : x) })} /></Field></div><button type="button" className="p-2 text-danger" aria-label={`Odebrat CV${c.number}`} onClick={() => update(d.id, { cvs: d.cvs.filter((_, j) => j !== i) })}>×</button></div>
            </div>)}</div>
            <button type="button" className={`${button} mt-2`} disabled={d.cvs.length >= 1024} onClick={() => update(d.id, { cvs: [...d.cvs, { number: 1, value: 0, cv31: null, cv32: null, note: "" }] })}>+ Přidat CV</button>
          </details>
            </div>
          </details>
        </article>)}
        <div className="grid items-end gap-3 @sm:grid-cols-[auto_minmax(0,1fr)_auto]">
          <button type="button" className={button} disabled={config.decoders.length >= 12} onClick={() => add()}>+ Přidat dekodér</button>
          {!!templates.length && <><div className="min-w-0 flex-1"><Field label="Kopírovat z existujícího dekodéru"><select className={input} value={templateId} onChange={e => setTemplateId(e.target.value)}><option value="">Vyberte předlohu…</option>{templates.map(t => <option key={t.decoder.id} value={t.decoder.id}>{t.label}</option>)}</select></Field></div><button type="button" className={button} disabled={!templateId || config.decoders.length >= 12} onClick={() => add(templates.find(t => t.decoder.id === templateId)!.decoder)}>Kopírovat</button></>}
        </div>
        {!!templates.length && <p className="text-xs text-secondary">Kopie přebírá funkce a CV a používá adresu tohoto vozidla. Další změny předlohy kopii neovlivní.</p>}
      </fieldset>
  </div>;
}
