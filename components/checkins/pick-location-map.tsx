"use client";

import "leaflet/dist/leaflet.css";
import * as React from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";

const pinIcon = L.divIcon({
  html: `
    <div style="position:relative;width:32px;height:40px;transform:translate(-50%,-100%);filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35))">
      <svg width="32" height="40" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z" fill="#f97316"/>
        <circle cx="14" cy="14" r="6.5" fill="white"/>
      </svg>
      <span style="position:absolute;top:7px;left:0;width:32px;text-align:center;font-size:13px;line-height:1">📍</span>
    </div>`,
  className: "checkin-pin",
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

/** Keeps the map centred on the position when it changes externally (geolocation). */
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const last = React.useRef<string>("");
  React.useEffect(() => {
    const key = `${lat},${lng}`;
    if (key !== last.current) {
      last.current = key;
      map.setView([lat, lng], map.getZoom());
    }
  }, [map, lat, lng]);
  return null;
}

export default function PickLocationMap({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <Recenter lat={lat} lng={lng} />
      <Marker
        position={[lat, lng]}
        icon={pinIcon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const m = e.target as L.Marker;
            const p = m.getLatLng();
            onChange(p.lat, p.lng);
          },
        }}
      />
    </MapContainer>
  );
}
