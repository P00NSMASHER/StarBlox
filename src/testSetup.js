// Shared Vitest browser-environment shims for presentation runtimes.
// These do not ship in the production bundle; they only make jsdom behave
// like the browser APIs the app relies on and prevent queued DOM scans from
// firing after a test environment has already been torn down.

if (typeof document !== 'undefined') {
  if (typeof globalThis.CSS === 'undefined') globalThis.CSS = {};
  if (typeof globalThis.CSS.escape !== 'function') {
    globalThis.CSS.escape = value => String(value).replace(/([\\"])/g, '\\$1');
  }

  const nativeQueueMicrotask = globalThis.queueMicrotask?.bind(globalThis);
  if (nativeQueueMicrotask && !globalThis.__starbloxVitestQueueGuard) {
    globalThis.__starbloxVitestQueueGuard = true;
    globalThis.queueMicrotask = callback => nativeQueueMicrotask(() => {
      if (typeof document === 'undefined') return;
      callback();
    });
  }
}
