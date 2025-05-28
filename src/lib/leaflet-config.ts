
// src/lib/leaflet-config.ts
import type { Icon as LeafletIconType } from 'leaflet'; // Type import
// Import image assets directly
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

export function configureLeafletDefaultIcon(LInstance: typeof import('leaflet')) {
  // Check if already configured on the LInstance's Icon.Default prototype
  // This flag ensures the configuration runs only once per application lifecycle
  if (!(LInstance.Icon.Default.prototype as any)._iconInit && typeof window !== 'undefined') {
    delete (LInstance.Icon.Default.prototype as any)._getIconUrl; // Important: delete before merging options

    LInstance.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x.src,
      iconUrl: markerIcon.src,
      shadowUrl: markerShadow.src,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28], // Added for completeness
      shadowSize: [41, 41],
    });
    (LInstance.Icon.Default.prototype as any)._iconInit = true;
  }
}
