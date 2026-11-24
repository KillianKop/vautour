/** Keep the screen on during a flight (Screen Wake Lock API: Chrome Android, Safari iOS 16.4+). */

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

let sentinel: WakeLockSentinelLike | null = null;
let wanted = false;

async function acquire(): Promise<void> {
  const api = (
    navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<WakeLockSentinelLike> } }
  ).wakeLock;
  if (!api || !wanted || sentinel) return;
  try {
    sentinel = await api.request("screen");
  } catch {
    sentinel = null; // refused (low battery, iframe, unsupported): the app still works
  }
}

export function keepScreenOn(on: boolean): void {
  wanted = on;
  if (on) void acquire();
  else {
    void sentinel?.release().catch(() => undefined);
    sentinel = null;
  }
}

// The lock is dropped when the page is hidden; take it again when the pilot comes back.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      sentinel = null;
      void acquire();
    }
  });
}
