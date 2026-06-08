/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

/**
 * Push notification handling (scaffold). The payload shape is documented in
 * lib/notifications. Delivery is not wired in the MVP, but the handler is ready
 * so subscriptions work end-to-end once a push provider is configured.
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json() as {
      title?: string;
      body?: string;
      url?: string;
    };
    event.waitUntil(
      self.registration.showNotification(data.title ?? "PromoSG", {
        body: data.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: data.url ?? "/dashboard" },
      }),
    );
  } catch {
    // ignore malformed payloads
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) ?? "/dashboard";
  event.waitUntil(self.clients.openWindow(url));
});

serwist.addEventListeners();
