import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

/** Offline banner + install button/iOS hint. Renders as a small floating bar. */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("nexahr_install_dismissed") === "1"; } catch { return false; }
  });
  const [installed, setInstalled] = useState(isStandalone());
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem("nexahr_install_dismissed", "1"); } catch { /* ignore */ }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  const showInstall = !installed && !dismissed && (deferred || isIOS);

  return (
    <>
      {!online && (
        <div className="fixed inset-x-0 top-0 z-[100] bg-amber-500 px-4 py-2 text-center text-sm font-medium text-black" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}>
          You're offline. Reconnect to load and save data.
        </div>
      )}
      {showInstall && (
        <div className="fixed inset-x-3 z-[90] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-[#1e1038] p-3 text-white shadow-xl" style={{ bottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>
          <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-lg" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">Install NexaHR</p>
            <p className="text-white/70">{deferred ? "Add it to your home screen for quick access." : "Tap Share, then “Add to Home Screen”."}</p>
          </div>
          {deferred && (
            <button onClick={install} className="focus-ring rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold hover:bg-violet-500">Install</button>
          )}
          <button onClick={dismiss} aria-label="Dismiss" className="focus-ring rounded-lg p-1 text-white/60 hover:text-white">✕</button>
        </div>
      )}
    </>
  );
}
