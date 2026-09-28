import { OwnedCatalogDetails } from '@/components/owned-catalog-details';
import { EpochBadges } from '@/components/vehicle-epochs';
import { formatVehicleLength } from '@/components/vehicle-length';
import { OperatorLogo } from '@/components/operator-logo';
import { ManufacturerLogo } from '@/components/manufacturer-logo';
import { EditAction } from '@/components/ui-actions';
import { VehicleDetailImage } from '@/components/vehicle-detail-image';
import { ClassBadge } from '@/components/class-badge';
import { vehicleSection } from '@/lib/vehicle-kind';
import type { schema } from '@/db';

export function OwnedVehicleHeader({vehicle}: {vehicle: typeof schema.vehicles.$inferSelect}) {
  return (
    <section aria-label={vehicle.type === 'loco' ? 'Přehled lokomotivy' : 'Společné údaje vozu'} className="edit-reveal-scope rounded-lg border border-divider p-4 sm:p-5">
      {vehicle.imagePath && <div className="mb-4 rounded-lg bg-subtle px-4 py-5 sm:px-6" data-locomotive-image={vehicle.type === 'loco' ? '' : undefined}>
        <VehicleDetailImage src={vehicle.imagePath} alt={vehicle.designation}
          width={(vehicle.imageWidth || 264) * 2} height={(vehicle.imageHeight || 41) * 2} center />
      </div>}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
          <span data-vehicle-label="operator"><OperatorLogo operator={vehicle.operator} height={32} maxWidth={160} /></span>
          <h1 className="text-2xl font-bold">{vehicle.designation}</h1>
          <EpochBadges epochs={vehicle.epochs} />
          <span data-vehicle-label="class" className="inline-flex"><ClassBadge classType={vehicle.classType} size="md" /></span>
          {vehicle.lengthOverBuffersMm != null && <span title="Délka modelu přes nárazníky" aria-label={`Délka modelu přes nárazníky: ${formatVehicleLength(vehicle.lengthOverBuffersMm)}`} className="text-sm tabular-nums text-secondary">{formatVehicleLength(vehicle.lengthOverBuffersMm)}</span>}
          <span className="ml-auto flex flex-wrap items-center justify-end gap-3">
          {vehicle.manufacturer && <ManufacturerLogo manufacturer={vehicle.manufacturer} />}
          {vehicle.catalogNumber && <span title="Katalogové číslo výrobce" className="text-sm text-secondary">{vehicle.catalogNumber}</span>}
          </span>
        </div>
        <span className="edit-reveal"><EditAction href={`/${vehicleSection(vehicle)}/${vehicle.id}/upravit`} label={vehicle.type === 'loco' ? 'Upravit lokomotivu' : 'Upravit společné údaje varianty'} /></span>
      </div>
      {vehicle.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-secondary">{vehicle.description}</p>}
      <OwnedCatalogDetails catalogId={vehicle.catalogId} />
    </section>
  );
}
