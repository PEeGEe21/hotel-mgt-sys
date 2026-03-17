'use client';

import { MapContainer, TileLayer, Circle, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number | null;
  enabled?: boolean;
};

export default function GeofenceMap({ latitude, longitude, radiusMeters, enabled }: Props) {
  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';
  const radius = Math.max(10, Number(radiusMeters ?? 150));

  if (!enabled) {
    return (
      <div className="h-48 rounded-xl border border-[#1e2536] bg-[#0f1117] flex items-center justify-center text-sm text-slate-600">
        Location lock is disabled.
      </div>
    );
  }

  if (!hasCoords) {
    return (
      <div className="h-48 rounded-xl border border-[#1e2536] bg-[#0f1117] flex items-center justify-center text-sm text-slate-600">
        Set hotel latitude and longitude to preview the geofence.
      </div>
    );
  }

  const center: [number, number] = [latitude as number, longitude as number];

  return (
    <div className="h-56 rounded-xl overflow-hidden border border-[#1e2536]">
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Circle
          center={center}
          radius={radius}
          pathOptions={{ color: '#22c55e', weight: 2, fillColor: '#22c55e', fillOpacity: 0.15 }}
        />
        <CircleMarker
          center={center}
          radius={6}
          pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1 }}
        />
      </MapContainer>
    </div>
  );
}
