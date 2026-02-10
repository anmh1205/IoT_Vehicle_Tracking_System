'use client';

import { TileLayer } from 'react-leaflet';

export function MapLayerSwitcher() {
  return <TileLayer attribution='&copy; OpenStreetMap contributors' url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />;
}
