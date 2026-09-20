"use client";

import { EditAction } from "@/components/ui-actions";
import { useRef, useState, useEffect } from "react";
import { identicalDirections, parseSpeedProfile, profileWarnings, type SavedSpeedProfile, type SpeedProfile } from "@/lib/speed-profile";

const speedFormat = new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });
const formatSpeed = (value: number | null) => value === null ? "—" : speedFormat.format(value);

const emptyProfile = (): SpeedProfile => ({ schemaVersion: 1, measuredOn: null, measurementMode: "unknown", primaryDirection: "forward", speedSteps: 28, scaleRatio: 160, unit: "km/h", speedBasis: "prototype-equivalent", notes: "", source: null, points: [{ step: 1, forwardKmh: null, reverseKmh: null }] });
const field = "w-full rounded-md border border-control bg-surface px-3 py-2 text-sm";
const button = "ui-button ui-button-secondary";
function rowsText(p: SpeedProfile) { return p.points.map(v => `${v.step};${v.forwardKmh ?? ""};${v.reverseKmh ?? ""}`).join("\n"); }
function parseRows(value: string) {
  return value.trim().split(/\r?\n/).filter(v => v.trim()).map(line => {
    const columns = line.split(/[;\t]/).map(v => v.trim());
    if (columns.length !== 3 || !/^\d+$/.test(columns[0])) throw new Error("Každý řádek musí obsahovat krok;vpřed;vzad. Prázdná rychlost znamená neznámou hodnotu.");
    const number = (v: string) => v === "" ? null : Number(v.replace(",", "."));
    return { step: Number(columns[0]), forwardKmh: number(columns[1]), reverseKmh: number(columns[2]) };
  });
}

function Curve({ profile, both }: { profile: SpeedProfile; both: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(500);
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const points = profile.points;
  const directions = both ? ["forwardKmh", "reverseKmh"] as const : [profile.primaryDirection === "forward" ? "forwardKmh" : "reverseKmh"] as const;
  const max = Math.max(1, ...points.flatMap(p => directions.map(d => p[d] ?? 0))) * 1.05;
  const last = Math.max(1, ...points.map(p => p.step));
  const x = (step: number) => 52 + step / last * (width - 72);
  const y = (value: number) => 210 - value / max * 170;
  const point = selected === null ? null : points.find(p => p.step === selected);
  return <div ref={ref} className="min-w-0">
    <svg viewBox={`0 0 ${width} 260`} className="w-full" role="img" aria-label={`Rychlostní profil, ${points.length} kroků. ${both ? "Vpřed a vzad" : "Jeden směr"}. Rychlosti v km/h ve skutečném měřítku.`}>
      {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1={52} x2={width - 20} y1={y(max * i / 4)} y2={y(max * i / 4)} stroke="var(--divider)" /><text x={44} y={y(max * i / 4) + 4} textAnchor="end" fontSize={12} fill="var(--secondary)">{formatSpeed(max * i / 4)}</text></g>)}
      <text x={52} y={20} fontSize={12} fill="var(--secondary)">Rychlost (km/h)</text>
      {[...new Set([0, Math.round(last / 2), last])].map(step => <text key={step} x={x(step)} y={230} textAnchor="middle" fontSize={12} fill="var(--secondary)">{step}</text>)}
      <text x={width / 2} y={252} textAnchor="middle" fontSize={12} fill="var(--secondary)">Jízdní krok</text>
      {directions.map(d => {
        let connected = false;
        const path = points.map(p => { if (p[d] === null) { connected = false; return ""; } const part = `${connected ? "L" : "M"}${x(p.step)},${y(p[d])}`; connected = true; return part; }).join(" ");
        return <g key={d}><path d={path} fill="none" stroke={d === "forwardKmh" ? "var(--chart)" : "var(--chart-reverse)"} strokeWidth={2} strokeDasharray={d === "reverseKmh" ? "5 3" : undefined} />{points.filter(p => p[d] !== null).map(p => <circle key={p.step} cx={x(p.step)} cy={y(p[d]!)} r={2.5} fill={d === "forwardKmh" ? "var(--chart)" : "var(--chart-reverse)"} />)}</g>;
      })}
      {point && <line x1={x(point.step)} x2={x(point.step)} y1={36} y2={210} stroke="var(--secondary)" />}
    </svg>
    {both && <p className="mb-3 text-sm"><span className="text-accent">━ Vpřed</span><span className="ml-4 text-[var(--chart-reverse)]">┄ Vzad</span></p>}
    <label className="block text-sm">Jízdní krok: {point?.step ?? points[0].step}
      <input type="range" className="mt-2 w-full accent-accent" min={0} max={points.length - 1} value={Math.max(0, points.findIndex(p => p.step === selected))} onChange={e => setSelected(points[Number(e.target.value)].step)} />
    </label>
    <p className="mt-1 text-sm tabular-nums" aria-live="polite">{directions.map(d => `${both ? d === "forwardKmh" ? "Vpřed: " : "Vzad: " : ""}${formatSpeed((point ?? points[0])[d])} km/h`).join(" · ")}</p>
  </div>;
}

export function SpeedProfileEditor({ vehicleId, initial }: { vehicleId: number; initial: SavedSpeedProfile | null }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<SpeedProfile>(initial?.profile ?? emptyProfile());
  const [rows, setRows] = useState(rowsText(draft));
  const [editing, setEditing] = useState(false);
  const [both, setBoth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const profile = saved?.profile;
  const equal = profile ? identicalDirections(profile) : false;
  const combined = profile ? equal || profile.measurementMode === "single-direction" : true;
  function begin() {
    const p = saved?.profile ?? emptyProfile(); setDraft(p); setRows(rowsText(p)); setError(""); setMessage(""); setEditing(true);
  }
  async function save() {
    setError(""); setMessage("");
    let next;
    try { next = parseSpeedProfile({ ...draft, points: parseRows(rows) }); }
    catch (e) { setError(e instanceof Error ? ("issues" in e ? "Zkontrolujte datum, rozsah kroků a nezáporné číselné rychlosti." : e.message) : "Neplatný profil."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/vozidla/${vehicleId}/rychlostni-profil`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile: next, expectedUpdatedAt: saved?.updatedAt ?? null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Uložení se nezdařilo.");
      setSaved(result); setEditing(false); setBoth(false); setMessage("Rychlostní profil uložen.");
    } catch (e) { setError(e instanceof Error ? e.message : "Uložení se nezdařilo."); }
    finally { setBusy(false); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 250000) throw new Error("Soubor je příliš velký.");
      const data = JSON.parse(await file.text());
      const p = parseSpeedProfile(data.profile ?? data);
      if (p.source?.vehicleSourceId && p.source.vehicleSourceId !== `vlacky:vehicle:${vehicleId}`) throw new Error("Profil patří jinému vozidlu.");
      setDraft(p); setRows(rowsText(p));
    } catch (e) { setError(e instanceof Error && !("issues" in e) ? e.message : "Soubor neobsahuje podporovaný profil Vlacky."); }
  }
  return <section className="config-section" aria-labelledby="speed-profile-title">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divider pb-4"><h2 id="speed-profile-title" className="font-semibold">Rychlostní profil</h2>{!editing && (profile ? <EditAction label="Upravit rychlostní profil" onClick={begin} /> : <button className={button} onClick={begin}>Přidat / importovat</button>)}</div>
    <div className="space-y-4 pt-5">
      {message && <p role="status" className="text-sm text-success">{message}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {editing ? <form onSubmit={e => { e.preventDefault(); void save(); }}>
        <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
          <p className="text-sm text-secondary">Ukládá se pouze aktuální profil. Nové uložení nahradí předchozí hodnoty.</p>
          <label className="block text-sm">Import profilu Vlacky (JSON)<input type="file" accept=".json,application/json" className="mt-1 block w-full text-sm" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ""; }} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">Datum měření<input type="date" className={field} value={draft.measuredOn ?? ""} onChange={e => setDraft({ ...draft, measuredOn: e.target.value || null })} /></label>
            <label className="block text-sm">Způsob měření<select className={field} value={draft.measurementMode} onChange={e => setDraft({ ...draft, measurementMode: e.target.value as SpeedProfile["measurementMode"] })}><option value="single-direction">Jeden směr pro oba směry</option><option value="both-directions">Oba směry samostatně</option><option value="unknown">Neznámý</option></select></label>
            <label className="block text-sm">Hlavní směr<select className={field} value={draft.primaryDirection} onChange={e => setDraft({ ...draft, primaryDirection: e.target.value as SpeedProfile["primaryDirection"] })}><option value="forward">Vpřed</option><option value="reverse">Vzad</option></select></label>
            <label className="block text-sm">Počet jízdních kroků<select className={field} value={draft.speedSteps} onChange={e => setDraft({ ...draft, speedSteps: Number(e.target.value) as SpeedProfile["speedSteps"] })}>{[14, 28, 126, 128].map(v => <option key={v}>{v}</option>)}</select></label>
            <label className="block text-sm">Měřítko 1 :<input type="number" min={1} max={1000} step="any" className={field} value={draft.scaleRatio} onChange={e => setDraft({ ...draft, scaleRatio: Number(e.target.value) })} /></label>
          </div>
          <label className="block text-sm">Poznámka<textarea className={field} rows={2} maxLength={4000} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></label>
          <details><summary className="cursor-pointer text-sm font-medium">Upravit naměřené hodnoty</summary><p className="my-2 text-sm text-secondary">Jeden řádek: krok;vpřed;vzad. Rychlosti v km/h skutečné předlohy. Prázdná hodnota = neznámá.</p><label className="block text-sm">Hodnoty po krocích<textarea className={`${field} font-mono`} rows={12} value={rows} onChange={e => setRows(e.target.value)} /></label>
            <button type="button" className={`${button} mt-2`} onClick={() => { try { const p = parseRows(rows); setRows(rowsText({ ...draft, points: p.map(v => ({ ...v, forwardKmh: draft.primaryDirection === "forward" ? v.forwardKmh : v.reverseKmh, reverseKmh: draft.primaryDirection === "forward" ? v.forwardKmh : v.reverseKmh })) })); setDraft({ ...draft, measurementMode: "single-direction" }); } catch (e) { setError(e instanceof Error ? e.message : "Neplatné hodnoty."); } }}>Použít hlavní směr pro oba směry</button>
          </details>
          <div className="flex gap-2"><button type="submit" className="ui-button ui-button-primary">{busy ? "Ukládání…" : "Uložit změny"}</button><button type="button" className="ui-button ui-button-quiet" onClick={() => { setEditing(false); setError(""); }}>Zrušit</button></div>
        </fieldset>
      </form> : profile ? <>
        <p className="text-sm text-secondary">{profile.measuredOn ? `Měřeno ${profile.measuredOn.split("-").reverse().join(". ")}` : "Datum měření neznámé"} · {profile.speedSteps} kroků · 1:{profile.scaleRatio}{profile.source?.application ? ` · ${profile.source.application}` : ""}</p>
        {combined && <p className="text-sm text-secondary">{equal ? "Shodné rychlosti pro oba směry" : "Měřeno v jednom směru, použito pro oba směry"}</p>}
        <Curve key={saved.updatedAt} profile={profile} both={!combined || both} />
        {combined && !equal && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={both} onChange={e => setBoth(e.target.checked)} />Zobrazit oba uložené směry</label>}
        {profile.notes && <p className="whitespace-pre-wrap text-sm text-secondary">{profile.notes}</p>}
        {profileWarnings(profile).map(w => <p key={w} className="text-sm text-warning">{w}</p>)}
        <details><summary className="cursor-pointer text-sm font-medium">Hodnoty po krocích</summary><div className="mt-3 overflow-x-auto"><table className="w-full text-right text-sm tabular-nums"><thead><tr className="border-b"><th className="py-2 text-left">Krok</th>{(!combined || both) ? <><th>Vpřed (km/h)</th><th>Vzad (km/h)</th></> : <th>Rychlost (km/h)</th>}</tr></thead><tbody>{profile.points.map(p => <tr key={p.step} className="border-b border-divider"><td className="py-1 text-left">{p.step}</td>{(!combined || both) ? <><td>{formatSpeed(p.forwardKmh)}</td><td>{formatSpeed(p.reverseKmh)}</td></> : <td>{formatSpeed(profile.primaryDirection === "forward" ? p.forwardKmh : p.reverseKmh)}</td>}</tr>)}</tbody></table></div></details>
        <a className="inline-block text-sm text-accent hover:underline" download={`rychlostni-profil-${vehicleId}.json`} href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(saved, null, 2))}`}>Stáhnout profil (JSON)</a>
      </> : <p className="text-sm text-secondary">Zatím bez měření. Profil z iTrain sem můžete uložit jako zálohu.</p>}
    </div>
  </section>;
}
