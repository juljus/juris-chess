"use client";

import { useState, useEffect } from "react";

type NotificationState = "unsupported" | "denied" | "prompt" | "subscribed" | "loading";

export function NotificationButton() {
  const [state, setState] = useState<NotificationState>("loading");

  useEffect(() => {
    checkNotificationState();
  }, []);

  const checkNotificationState = async () => {
    // Check if push notifications are supported
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    // Check permission status
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    // Check if already subscribed
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          setState("subscribed");
          return;
        }
      }
    } catch {
      // Ignore errors
    }

    setState("prompt");
  };

  const subscribe = async () => {
    setState("loading");

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Send subscription to server
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!response.ok) {
        throw new Error("Failed to save subscription");
      }

      setState("subscribed");
    } catch (error) {
      console.error("Failed to subscribe:", error);
      // Check if permission was denied
      if (Notification.permission === "denied") {
        setState("denied");
      } else {
        setState("prompt");
      }
    }
  };

  const unsubscribe = async () => {
    setState("loading");

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          // Unsubscribe from push
          await subscription.unsubscribe();

          // Remove from server
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
        }
      }
      setState("prompt");
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
      setState("prompt");
    }
  };

  if (state === "unsupported") {
    return null;
  }

  if (state === "denied") {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 rounded-lg cursor-not-allowed"
        title="Teavitused on brauseris blokeeritud"
      >
        <BellOffIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Blokeeritud</span>
      </button>
    );
  }

  if (state === "loading") {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
      >
        <LoadingIcon className="w-4 h-4 animate-spin" />
        <span className="hidden sm:inline">Laen...</span>
      </button>
    );
  }

  if (state === "subscribed") {
    return (
      <button
        onClick={unsubscribe}
        className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
        title="Keela teavitused"
      >
        <BellIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Teavitused sees</span>
      </button>
    );
  }

  return (
    <button
      onClick={subscribe}
      className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
      title="Luba teavitused"
    >
      <BellIcon className="w-4 h-4" />
      <span className="hidden sm:inline">Luba teavitused</span>
    </button>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function BellOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11M6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9M3 3l18 18" />
    </svg>
  );
}

function LoadingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
