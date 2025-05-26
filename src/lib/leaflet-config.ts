// src/lib/leaflet-config.ts
// This file NO LONGER imports 'L' from 'leaflet' directly at the top level.
// It exports a function to configure an L instance that's passed to it.

import type { Icon as LeafletIconType } from "leaflet"; // Type import for L.Icon.Default

export function configureLeafletDefaultIcon(
  LInstance: typeof import("leaflet")
) {
  // Check if already configured on the LInstance's Icon.Default prototype
  // This flag is set on the prototype of the L.Icon.Default class itself.
  if (!(LInstance.Icon.Default.prototype as any)._iconInit) {
    delete (LInstance.Icon.Default.prototype as any)._getIconUrl; // Recommended to prevent Leaflet from trying to guess paths

    const iconBasePath = "/images/leaflet/"; // Path relative to the 'public' directory

    const iconUrl = `${iconBasePath}marker-icon.png`;
    const iconRetinaUrl = `${iconBasePath}marker-icon-2x.png`;
    const shadowUrl = `${iconBasePath}marker-shadow.png`;
    const defaultOptions = LInstance.Icon.Default.prototype.options;

    // Direct assignment
    defaultOptions.iconUrl = iconUrl;
    defaultOptions.iconRetinaUrl = iconRetinaUrl;
    defaultOptions.shadowUrl = shadowUrl;

    // Ensure all other necessary default options are set
    // (values taken from Leaflet defaults or common configurations)
    defaultOptions.iconSize = [25, 41];
    defaultOptions.iconAnchor = [12, 41];
    defaultOptions.popupAnchor = [1, -34];
    defaultOptions.tooltipAnchor = [16, -28]; // Often a default
    defaultOptions.shadowSize = [41, 41];

    (LInstance.Icon.Default.prototype as any)._iconInit = true;
  }
}
