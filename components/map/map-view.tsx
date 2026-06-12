"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import * as React from "react";
import L from "leaflet";
import "leaflet.markercluster";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { CATEGORY_META } from "@/lib/constants";
import type { Promotion } from "@/lib/types";
import type { StaticPin } from "@/lib/map/static-pins";

const SG_CENTER: [number, number] = [1.3521, 103.8198];

export interface FlyTarget {
  lat: number;
  lng: number;
  zoom?: number;
  nonce: number;
}

const DOT_HEX: Record<Promotion["category"], string> = {
  food_beverage: "#f97316",
  shopping: "#ec4899",
  attractions: "#10b981",
  events: "#8b5cf6",
  travel: "#0ea5e9",
  credit_card: "#6366f1",
  entertainment: "#f43f5e",
  lifestyle: "#14b8a6",
};

// Static-pin layer colours
const LAYER_HEX: Record<StaticPin["layer"], string> = {
  food: "#f97316",
  gem: "#8b5cf6",
  spot: "#10b981",
};

const iconCache = new Map<string, L.DivIcon>();

function pinIcon(category: Promotion["category"]): L.DivIcon {
  const cached = iconCache.get(category);
  if (cached) return cached;
  const meta = CATEGORY_META[category];
  const color = DOT_HEX[category] ?? "#6366f1";
  const html = `
    <div style="position:relative;width:30px;height:38px;transform:translate(-50%,-100%);filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3))">
      <svg width="30" height="38" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z" fill="${color}"/>
        <circle cx="14" cy="14" r="6.5" fill="white"/>
      </svg>
      <span style="position:absolute;top:6px;left:0;width:30px;text-align:center;font-size:12px;line-height:1">${meta.emoji}</span>
    </div>`;
  const icon = L.divIcon({ html, className: "promo-pin", iconSize: [30, 38], iconAnchor: [15, 38] });
  iconCache.set(category, icon);
  return icon;
}

function staticPinIcon(pin: StaticPin): L.DivIcon {
  const cacheKey = `static-${pin.layer}-${pin.emoji}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;
  const color = LAYER_HEX[pin.layer] ?? "#8b5cf6";
  const html = `
    <div style="position:relative;width:30px;height:38px;transform:translate(-50%,-100%);filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3))">
      <svg width="30" height="38" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z" fill="${color}"/>
        <circle cx="14" cy="14" r="6.5" fill="white"/>
      </svg>
      <span style="position:absolute;top:6px;left:0;width:30px;text-align:center;font-size:12px;line-height:1">${pin.emoji}</span>
    </div>`;
  const icon = L.divIcon({ html, className: "static-pin", iconSize: [30, 38], iconAnchor: [15, 38] });
  iconCache.set(cacheKey, icon);
  return icon;
}

const userIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#0a84ff;border:3px solid white;box-shadow:0 0 0 4px rgba(10,132,255,0.25),0 1px 3px rgba(0,0,0,0.3);transform:translate(-50%,-50%)"></div>`,
  className: "user-pin",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function clusterIcon(cluster: { getChildCount: () => number }): L.DivIcon {
  const n = cluster.getChildCount();
  const size = n < 10 ? 36 : n < 50 ? 44 : 52;
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:rgba(16,185,129,0.92);color:white;font-weight:700;font-size:13px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25)">${n}</div>`,
    className: "promo-cluster",
    iconSize: [size, size],
  });
}

function staticClusterIcon(cluster: { getChildCount: () => number }): L.DivIcon {
  const n = cluster.getChildCount();
  const size = n < 10 ? 36 : n < 50 ? 44 : 52;
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:rgba(139,92,246,0.92);color:white;font-weight:700;font-size:13px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25)">${n}</div>`,
    className: "static-cluster",
    iconSize: [size, size],
  });
}

function ClusterLayer({
  promotions,
  onSelect,
}: {
  promotions: Promotion[];
  onSelect: (p: Promotion) => void;
}) {
  const map = useMap();
  React.useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: clusterIcon,
    });
    for (const p of promotions) {
      if (p.latitude == null || p.longitude == null) continue;
      const m = L.marker([p.latitude, p.longitude], { icon: pinIcon(p.category) });
      m.on("click", () => onSelect(p));
      group.addLayer(m);
    }
    map.addLayer(group);
    return () => { map.removeLayer(group); };
  }, [map, promotions, onSelect]);
  return null;
}

function StaticPinLayer({
  pins,
  onSelect,
}: {
  pins: StaticPin[];
  onSelect: (p: StaticPin) => void;
}) {
  const map = useMap();
  React.useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 60,
      iconCreateFunction: staticClusterIcon,
    });
    for (const p of pins) {
      const m = L.marker([p.lat, p.lng], { icon: staticPinIcon(p) });
      m.on("click", () => onSelect(p));
      group.addLayer(m);
    }
    map.addLayer(group);
    return () => { map.removeLayer(group); };
  }, [map, pins, onSelect]);
  return null;
}

function FlyController({ target }: { target: FlyTarget | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom ?? 15, { duration: 0.8 });
    }
  }, [map, target]);
  return null;
}

export default function MapView({
  promotions,
  staticPins,
  onSelect,
  onSelectPin,
  flyTarget,
  userPos,
}: {
  promotions: Promotion[];
  staticPins?: StaticPin[];
  onSelect: (p: Promotion) => void;
  onSelectPin?: (p: StaticPin) => void;
  flyTarget: FlyTarget | null;
  userPos: { lat: number; lng: number } | null;
}) {
  return (
    <MapContainer
      center={SG_CENTER}
      zoom={12}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <ClusterLayer promotions={promotions} onSelect={onSelect} />
      {staticPins && onSelectPin && (
        <StaticPinLayer pins={staticPins} onSelect={onSelectPin} />
      )}
      <FlyController target={flyTarget} />
      {userPos && <Marker position={[userPos.lat, userPos.lng]} icon={userIcon} />}
    </MapContainer>
  );
}
