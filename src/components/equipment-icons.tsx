import { LightBulbIcon, PaintBrushIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { equipmentIndicators, type EquipmentSymbol, type VehicleEquipment } from '@/lib/vehicle-equipment';

export function EquipmentGlyph({ name, className = 'size-5' }: { name: EquipmentSymbol; className?: string }) {
  if (name === 'sound') return <SpeakerWaveIcon aria-hidden="true" strokeWidth={1.5} className={className} />;
  if (name === 'weather') return <PaintBrushIcon aria-hidden="true" strokeWidth={1.5} className={className} />;
  if (name === 'lights') return <LightBulbIcon aria-hidden="true" strokeWidth={1.5} className={className} />;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {name === 'coupler' ? <><path d="M5 3v10a7 7 0 0 0 14 0V3h-4v10a3 3 0 0 1-6 0V3Z" /><path d="M5 8h4m6 0h4" /></> : <><circle cx="8" cy="12" r="2.5" /><circle cx="16" cy="12" r="2.5" /><path d="M3 7 1.5 5.5M3 12H1m2 5-1.5 1.5M21 7l1.5-1.5M21 12h2m-2 5 1.5 1.5" /></>}
  </svg>;
}

export function EquipmentIcons({ value, wagon = true, activeOnly = false, focusable = true }: {
  value: Partial<VehicleEquipment> & { hasLights?: boolean | null };
  wagon?: boolean; activeOnly?: boolean; focusable?: boolean;
}) {
  const items = equipmentIndicators(value, wagon).filter(item => !activeOnly || item.active);
  if (!items.length) return null;
  return <span className="inline-flex flex-wrap items-center gap-1.5" role="group" aria-label="Vybavení kusu">
    {items.map(item => <span key={item.key} role="img" aria-label={item.label} title={item.label} tabIndex={focusable ? 0 : undefined}
      className={`equipment-indicator relative inline-flex size-8 shrink-0 items-center justify-center rounded-md ${item.active ? 'bg-accent-soft text-accent' : 'text-secondary'}`}>
      <span className={item.active ? '' : 'opacity-45'}><EquipmentGlyph name={item.key} /></span>
      <span aria-hidden="true" className={`absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-canvas text-[9px] font-bold leading-none ${item.active ? 'text-accent' : 'text-secondary'}`}>{item.badge || (item.active ? '✓' : '−')}</span>
      <span aria-hidden="true" className="equipment-tooltip pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-max max-w-56 rounded bg-foreground px-2 py-1 text-xs font-normal text-canvas opacity-0">{item.label}</span>
    </span>)}
  </span>;
}
