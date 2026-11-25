// Thin wrapper over node-notifier. Kept as its own file so swapping to a
// different backend later (or mocking it in tests) is a one-file change.

import notifier from 'node-notifier';

// Basic notifications can use AppleScript without waiting for a native
// notification helper to exit on Apple Silicon.
const macOptions = { withFallback: true, backend: 'osascript' };
const desktopNotifier = process.platform === 'darwin'
  ? new notifier.NotificationCenter(macOptions)
  : notifier;

/**
 * Fire-and-forget desktop notification. We don't await the notifier
 * callback or throw on failure. A missed toast (headless CI,
 * Do-Not-Disturb, locked screen) should never take the daemon down.
 */
export function notify(title: string, message: string): void {
  desktopNotifier.notify({
    title,
    message,
    sound: false,
  });
}
