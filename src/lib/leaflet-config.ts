
// src/lib/leaflet-config.ts
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Configure Leaflet's default icon paths globally and only once.
// The (L.Icon.Default.prototype as any)._iconInit check is a simple way
// to prevent this code from running multiple times if the module is re-evaluated (e.g., HMR).
if (!(L.Icon.Default.prototype as any)._iconInit) {
  delete (L.Icon.Default.prototype as any)._getIconUrl; // Recommended to prevent Leaflet from trying to guess paths

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x.src,
    iconUrl: markerIcon.src,
    shadowUrl: markerShadow.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
  (L.Icon.Default.prototype as any)._iconInit = true;
}

export default L;
