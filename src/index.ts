// Entry point. Wires adb + clipboard + notifier into a single polling loop.
// See CLAUDE.md for why this is polling-based rather than logcat/inotify.

import fs from 'node:fs/promises';
import { adbDevices, adbLatest, adbPull } from './adb.js';
import { copyImageToClipboard } from './clipboard.js';
import { notify } from './notify.js';
import { POLL_INTERVAL_MS, TMP_DIR } from './config.js';

let activeSerial: string | undefined;
let deviceWarning: string | undefined;

// Undefined means the selected device hasn't been scanned yet. Null means
// its folder was empty on the first scan.
let lastSeen: string | null | undefined;

function warnAboutDevice(message: string): void {
  if (deviceWarning !== message) console.warn(`[droid-clip] ${message}`);
  deviceWarning = message;
}

async function tick(): Promise<void> {
  let devices: string[];
  try {
    devices = await adbDevices();
  } catch {
    warnAboutDevice('Could not run adb devices. Check that adb is installed and on your PATH.');
    return;
  }

  const preferredSerial = process.env.ANDROID_SERIAL;
  if (preferredSerial && !devices.includes(preferredSerial)) {
    warnAboutDevice(`Android device ${preferredSerial} is unavailable. Check adb devices or update ANDROID_SERIAL.`);
    return;
  }
  if (devices.length === 0) {
    warnAboutDevice('No authorized Android device found. Connect a device and allow debugging, then check adb devices.');
    return;
  }
  if (!preferredSerial && devices.length > 1) {
    warnAboutDevice('Multiple authorized Android devices found. Disconnect the others or set ANDROID_SERIAL to the desired device.');
    return;
  }

  const serial = preferredSerial || devices[0];
  if (deviceWarning || activeSerial !== serial) {
    console.log('[droid-clip] connected to device.');
  }
  deviceWarning = undefined;

  if (activeSerial !== serial) {
    activeSerial = serial;
    lastSeen = undefined;
  }

  let latest: string | null;
  try {
    latest = await adbLatest(serial);
  } catch {
    // The connection or screenshot folder can change between polls.
    return;
  }

  // Seed the first scan so connecting a device doesn't copy an old screenshot.
  if (lastSeen === undefined) {
    lastSeen = latest;
    return;
  }

  if (!latest || latest === lastSeen) return;

  // New screenshot detected. Update the marker FIRST so a slow pull/copy
  // can't cause us to re-trigger on the same file next tick.
  lastSeen = latest;

  try {
    const localPath = await adbPull(serial, latest);
    await copyImageToClipboard(localPath);
    notify('droid-clip', `Copied ${latest}`);
    console.log(`[droid-clip] copied ${latest}`);
  } catch (err) {
    // Pull or clipboard errors are worth surfacing: usually a missing xclip,
    // a phone disconnect mid-pull, or a genuine platform problem. We don't
    // crash the loop; the next screenshot should work once the issue clears.
    console.error(`[droid-clip] failed to handle ${latest}:`, err);
  }
}

async function main(): Promise<void> {
  // Make sure our tmp subdir exists; adb pull won't create the parent dir.
  await fs.mkdir(TMP_DIR, { recursive: true });

  console.log('[droid-clip] watching for screenshots… (Ctrl+C to stop)');

  // Recursive setTimeout (not setInterval) so a slow tick (e.g. a large
  // screenshot pull over a crowded USB bus) can never cause overlapping
  // runs of tick().
  const loop = async (): Promise<void> => {
    await tick();
    setTimeout(loop, POLL_INTERVAL_MS);
  };

  await loop();
}

main().catch((err) => {
  console.error('[droid-clip] fatal:', err);
  process.exit(1);
});
