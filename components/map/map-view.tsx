"use client";

import "leaflet/dist/leaflet.css";
import * as React from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import Link from "next/link";
import { CATEGORY_META } from "@/lib/constants";
import { formatDateRange } from "@/lib/format";
import type { Promotion } from "@/lib/types";

// Singapore center + sensible zoom for the whole island.
const SG_CENTER: [number, number] = [1.3521, 103.8198];

/** A small colored teardrop pin built from CATEGORY_META — avoids Leaflet's
 *  default-icon asset paths breaking under bundlers. */
const iconCache = new Map<string, L.DivIcon>();
function pinIcon(category: Promotion["category"]): L.DivIcon {
  const cached = iconCache.get(category);
  if (cached) return cached;
  const meta = CATEGORY_META[category];
  // Tailwind dot classes map to specific hex via a small lookup.
  const color = DOT_HEX[category] ?? "#6366f1";
  const html = `
    <div style="position:relative;width:28px;height:36px;transform:translate(-50%,-100%)">
      <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z" fill="${color}"/>
        <circle cx="14" cy="14" r="6" fill="white"/>
      </svg>
      <span style="position:absolute;top:5px;left:0;width:28px;text-align:center;font-size:12px;line-height:1">${meta.emoji}</span>
    </div>`;
  const icon = L.divIcon({
    html,
    className: "promo-pin",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -34],
  });
  iconCache.set(category, icon);
  return icon;
}

// Hex equivalents of the Tailwind 500-shades used in CATEGORY_META dotClass.
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

export default function MapView({ promotions }: { promotions: Promotion[] }) {
  return (
    <MapContainer
      center={SG_CENTER}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {promotions.map((p) => (
        <Marker
          key={p.id}
          position={[p.latitude as number, p.longitude as number]}
          icon={pinIcon(p.category)}
        >
          <Popup>
            <div className="w-52 space-y-1.5">
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt=""
                  className="h-24 w-full rounded-md object-cover"
                  loading="lazy"
                />
              )}
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: DOT_HEX[p.category] }}
              >
                {CATEGORY_META[p.category].emoji} {CATEGORY_META[p.category].label}
              </span>
              <p className="text-sm font-semibold leading-snug">{p.title}</p>
              <p className="text-xs text-neutral-500">
                {formatDateRange(p.startDate, p.endDate)}
              </p>
              {p.location && (
                <p className="text-xs text-neutral-500">📍 {p.location}</p>
              )}
              <Link
                href={`/promotions/${p.id}`}
                className="mt-1 inline-block text-xs font-semibold text-primary underline"
              >
                View details →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
