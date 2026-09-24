"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { OrderFulfillment } from "@/lib/supabase/types";
import type { StorefrontCatalog } from "@/lib/catalog/types";
import { resolvedDefaultMode } from "@/lib/catalog/template-settings";
import {
  fulfillmentModesForChannel,
  type StorefrontChannel,
} from "@/lib/catalog/storefront-paths";
import {
  clearPresenceChoice,
  firstOffPremise,
  readPresenceChoice,
  visibleModesForPresence,
  writePresenceChoice,
} from "@/lib/catalog/dine-in-presence";

export type DineInPresence = "here" | "away" | "qr" | null;

type StorefrontSessionValue = {
  catalog: StorefrontCatalog;
  restaurant: boolean;
  channel: StorefrontChannel;
  fulfillment: OrderFulfillment | null;
  setFulfillment: (mode: OrderFulfillment) => void;
  tableNo: string;
  setTableNo: (no: string) => void;
  presence: DineInPresence;
  visibleModes: OrderFulfillment[];
  gateOpen: boolean;
  canChangePresence: boolean;
  nearbyNote: string;
  tableLocked: boolean;
  chooseHere: (note?: string) => void;
  chooseAway: (note?: string) => void;
  resetPresence: () => void;
};

const StorefrontSessionContext = createContext<StorefrontSessionValue | null>(null);

export function StorefrontSessionProvider({
  catalog,
  restaurant,
  channel = "menu",
  initialTable,
  children,
}: {
  catalog: StorefrontCatalog;
  restaurant: boolean;
  channel?: StorefrontChannel;
  initialTable: string;
  children: ReactNode;
}) {
  const rest = catalog.settings.restaurant;
  const modes = fulfillmentModesForChannel(catalog.fulfillmentModes, channel);
  const dineChannel = channel === "dine" && modes.includes("dine_in");
  const qrLocked = Boolean(dineChannel && initialTable && rest.dineInQr);
  const needsGate =
    channel === "menu" &&
    restaurant &&
    modes.includes("dine_in") &&
    rest.requireInRestaurantCheck &&
    !qrLocked;

  const [fulfillment, setFulfillmentState] = useState<OrderFulfillment | null>(() => {
    if (dineChannel) return "dine_in";
    if (qrLocked) return "dine_in";
    if (needsGate) return null;
    return resolvedDefaultMode(modes, rest.defaultMode);
  });
  const [tableNo, setTableNoState] = useState(initialTable);
  const [presence, setPresence] = useState<Exclude<DineInPresence, "qr"> | null>(null);
  const [nearbyNote, setNearbyNote] = useState("");
  const [presenceReady, setPresenceReady] = useState(!needsGate || qrLocked);

  const effectivePresence: DineInPresence = qrLocked ? "qr" : presence;
  const gatePending = needsGate && presence === null;
  const gateOpen = gatePending && presenceReady;

  useEffect(() => {
    if (dineChannel) {
      setFulfillmentState("dine_in");
      if (qrLocked) setTableNoState(initialTable);
      setPresenceReady(true);
      return;
    }
    if (qrLocked) {
      setFulfillmentState("dine_in");
      setTableNoState(initialTable);
      setPresenceReady(true);
      return;
    }
    if (!needsGate) {
      setPresenceReady(true);
      return;
    }
    const stored = readPresenceChoice(catalog.id);
    if (stored === "here") {
      setPresence("here");
      setFulfillmentState("dine_in");
    } else if (stored === "away") {
      setPresence("away");
      setFulfillmentState(firstOffPremise(modes));
    }
    setPresenceReady(true);
  }, [catalog.id, dineChannel, initialTable, modes, needsGate, qrLocked]);

  const chooseHere = useCallback(
    (note = "") => {
      if (qrLocked) return;
      setPresence("here");
      setFulfillmentState("dine_in");
      setNearbyNote(note);
      writePresenceChoice(catalog.id, "here");
    },
    [catalog.id, qrLocked],
  );

  const chooseAway = useCallback(
    (note = "") => {
      if (qrLocked) return;
      setPresence("away");
      setFulfillmentState(firstOffPremise(modes));
      setNearbyNote(note);
      writePresenceChoice(catalog.id, "away");
    },
    [catalog.id, modes, qrLocked],
  );

  const resetPresence = useCallback(() => {
    if (qrLocked) return;
    setPresence(null);
    setFulfillmentState(null);
    setNearbyNote("");
    setTableNoState("");
    clearPresenceChoice(catalog.id);
  }, [catalog.id, qrLocked]);

  const setFulfillment = useCallback(
    (mode: OrderFulfillment) => {
      if (dineChannel && mode !== "dine_in") return;
      if (qrLocked && mode !== "dine_in") return;
      if (presence === "here" && mode !== "dine_in") return;
      if (presence === "away" && mode === "dine_in") return;
      setFulfillmentState(mode);
    },
    [dineChannel, presence, qrLocked],
  );

  function setTableNo(no: string) {
    setTableNoState(no);
    if (no && rest.dineInQr && modes.includes("dine_in")) {
      setFulfillmentState("dine_in");
    }
  }

  const visibleModes = visibleModesForPresence(modes, effectivePresence, gatePending);
  const canChangePresence = needsGate && (presence === "here" || presence === "away");

  const value = useMemo(
    () => ({
      catalog,
      restaurant,
      channel,
      fulfillment: dineChannel || qrLocked ? "dine_in" : fulfillment,
      setFulfillment,
      tableNo: qrLocked && !tableNo ? initialTable : tableNo,
      setTableNo,
      presence: effectivePresence,
      visibleModes,
      gateOpen,
      canChangePresence,
      nearbyNote,
      tableLocked: qrLocked,
      chooseHere,
      chooseAway,
      resetPresence,
    }),
    [
      canChangePresence,
      catalog,
      channel,
      chooseAway,
      chooseHere,
      dineChannel,
      effectivePresence,
      fulfillment,
      gateOpen,
      initialTable,
      nearbyNote,
      qrLocked,
      resetPresence,
      restaurant,
      setFulfillment,
      tableNo,
      visibleModes,
    ],
  );

  return <StorefrontSessionContext.Provider value={value}>{children}</StorefrontSessionContext.Provider>;
}

export function useStorefrontSession(): StorefrontSessionValue | null {
  return useContext(StorefrontSessionContext);
}

export function useStorefrontSessionRequired(): StorefrontSessionValue {
  const ctx = useContext(StorefrontSessionContext);
  if (!ctx) throw new Error("Storefront session missing");
  return ctx;
}
