"use client";

import { useState } from "react";
import { distanceMeters, resolveVenueCoords } from "@/lib/catalog/dine-in-presence";
import { useStorefrontSessionRequired } from "./StorefrontSession";

export function DineInPresenceGate() {
  const session = useStorefrontSessionRequired();
  const [locating, setLocating] = useState(false);
  const [locationMsg, setLocationMsg] = useState("");

  if (!session.gateOpen) return null;

  const rest = session.catalog.settings.restaurant;
  const venue = resolveVenueCoords({
    venueLat: rest.venueLat,
    venueLng: rest.venueLng,
    venueRadiusM: rest.venueRadiusM,
    geoLat: session.catalog.geoLat,
    geoLng: session.catalog.geoLng,
  });

  function useMyLocation() {
    if (locating) return;
    if (!venue) {
      setLocationMsg("Restaurant location is not set yet. Choose Yes or No, or ask staff to add coordinates in Ordering settings.");
      return;
    }
    if (!navigator.geolocation) {
      setLocationMsg("This browser cannot share location. Choose Yes or No.");
      return;
    }
    setLocating(true);
    setLocationMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const meters = distanceMeters(pos.coords.latitude, pos.coords.longitude, venue.lat, venue.lng);
        if (meters <= venue.radiusM) {
          session.chooseHere("You're nearby — dine-in is ready.");
          return;
        }
        session.chooseAway(
          "You're not near the restaurant, so dine-in isn't available. Pickup or delivery instead.",
        );
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationMsg("Location permission was declined. Choose Yes or No — we will not block the menu.");
          return;
        }
        setLocationMsg("Could not read your location. Choose Yes or No.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 15_000 },
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto bg-[var(--cat-ink)]/45 p-3 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="presence-gate-title"
        className="my-auto w-full max-w-md rounded-[18px] border border-[var(--cat-border)] bg-[var(--cat-bg)] p-5 shadow-[0_18px_50px_rgba(16,23,32,0.18)] sm:p-6"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--cat-muted)]">
          {session.catalog.name}
        </p>
        <h1 id="presence-gate-title" className="font-catalog-display mt-2 text-[24px] font-semibold leading-tight text-[var(--cat-ink)] sm:text-[28px]">
          Are you at the restaurant?
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--cat-muted)]">
          Dine-in is for guests already here. If you are ordering from somewhere else, use pickup or delivery.
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => session.chooseHere()}
            className="flex min-h-[52px] items-center justify-center rounded-[12px] px-4 text-[15px] font-bold text-white"
            style={{ background: "var(--cat-accent)" }}
          >
            Yes — dine in
          </button>
          <button
            type="button"
            onClick={() => session.chooseAway()}
            className="flex min-h-[52px] items-center justify-center rounded-[12px] border border-[var(--cat-border)] bg-white px-4 text-[15px] font-bold text-[var(--cat-ink)]"
          >
            No — pickup or delivery
          </button>
          <button
            type="button"
            disabled={locating}
            onClick={useMyLocation}
            className="flex min-h-12 items-center justify-center rounded-[12px] bg-[var(--cat-photo-bg)] px-4 text-[14px] font-bold text-[var(--cat-ink)] disabled:opacity-70"
          >
            {locating ? "Checking location…" : "Use my location"}
          </button>
        </div>
        {locationMsg ? (
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--cat-muted)]">{locationMsg}</p>
        ) : (
          <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--cat-muted)]">
            Location is optional. You can always choose Yes or No.
          </p>
        )}
      </div>
    </div>
  );
}
