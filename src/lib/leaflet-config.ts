
// src/lib/leaflet-config.ts
// This file NO LONGER imports 'L' from 'leaflet' directly at the top level.
// It exports a function to configure an L instance that's passed to it.

import type { Icon as LeafletIconType } from 'leaflet'; // Type import for L.Icon.Default
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

export function configureLeafletDefaultIcon(LInstance: typeof import('leaflet')) {
  // Check if already configured on the LInstance's Icon.Default prototype
  // This flag is set on the prototype of the L.Icon.Default class itself.
  if (!(LInstance.Icon.Default.prototype as any)._iconInit) {
    delete (LInstance.Icon.Default.prototype as any)._getIconUrl; // Recommended to prevent Leaflet from trying to guess paths

    LInstance.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x.src,
      iconUrl: markerIcon.src,
      shadowUrl: markerShadow.src,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    (LInstance.Icon.Default.prototype as any)._iconInit = true;
  }
}
