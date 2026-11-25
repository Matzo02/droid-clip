// Thin wrappers around the `adb` invocations the daemon needs.
// We use execFile (not exec) so arguments are passed as an array and there's
// no shell interpolation. That keeps filenames with spaces / quotes safe.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import {
  SCREENSHOT_DIR_CANDIDATES,
  SCREENSHOT_EXTS,
  TMP_DIR,
} from './config.js';

const execFileAsync = promisify(execFile);

// Cache the directory for the last device we successfully probed.
let resolvedTarget: { serial: string; dir: string } | null = null;

export async function adbDevices(): Promise<string[]> {
  const { stdout } = await execFileAsync('adb', ['devices']);
  const devices: string[] = [];

  for (const line of stdout.split(/\r?\n/)) {
    const [serial, state] = line.trim().split(/\s+/);
    if (serial && state === 'device') devices.push(serial);
  }

  return devices;
}

/**
 * Probes the candidate screenshot directories on the connected device and
 * returns the first one that exists. Caches the result, so after the first
 * success this is just a cheap property read.
 *
 * Throws if adb is unreachable or none of the candidates exist. Callers
 * swallow the throw and retry on the next poll tick.
 */
async function resolveScreenshotDir(serial: string): Promise<string> {
  if (resolvedTarget?.serial === serial) return resolvedTarget.dir;

  for (const candidate of SCREENSHOT_DIR_CANDIDATES) {
    try {
      // `ls -d` prints the dir name and exits 0 iff it exists. If the path
      // is missing, adb propagates ls's non-zero exit and execFileAsync
      // rejects, so we catch and try the next candidate.
      await execFileAsync('adb', ['-s', serial, 'shell', 'ls', '-d', candidate]);
      resolvedTarget = { serial, dir: candidate };
      console.log(`[droid-clip] using screenshot dir: ${candidate}`);
      return candidate;
    } catch {
      // Directory doesn't exist on this device, keep probing.
    }
  }

  throw new Error(
    `No known screenshot directory found on the connected device. Tried: ${SCREENSHOT_DIR_CANDIDATES.join(
      ', ',
    )}`,
  );
}

/**
 * Returns the filename (basename only, no path) of the most recent screenshot
 * on the phone, or null if the directory is empty.
 *
 * Throws if adb itself fails. The caller treats every throw as "phone
 * temporarily unreachable" and just retries on the next tick.
 */
export async function adbLatest(serial: string): Promise<string | null> {
  const dir = await resolveScreenshotDir(serial);

  // `ls -t` on Android's toybox sorts by mtime, newest first.
  // We don't pipe to `head -n 1` because relying on the Android shell to
  // support pipelines / head is fragile across vendors and Android versions,
  // and the listing is tiny anyway, so we just filter in JS.
  const { stdout } = await execFileAsync('adb', ['-s', serial, 'shell', 'ls', '-t', dir]);

  // Walk the output top-down and pick the first entry whose extension looks
  // like a screenshot. That skips anything weird the OEM might drop here
  // (.nomedia, thumbnails, pending_* temp files, etc.).
  for (const rawLine of stdout.split('\n')) {
    const name = rawLine.trim();
    if (!name) continue;
    const ext = path.extname(name).toLowerCase();
    if (SCREENSHOT_EXTS.includes(ext)) return name;
  }
  return null;
}

/**
 * Pulls the given screenshot from the phone into the local tmp dir and
 * returns the absolute local path. Overwrites any existing file with the
 * same name (same filename == same screenshot, so re-pull is safe).
 */
export async function adbPull(serial: string, filename: string): Promise<string> {
  const dir = await resolveScreenshotDir(serial);
  const remote = dir + filename;
  const local = path.join(TMP_DIR, filename);
  await execFileAsync('adb', ['-s', serial, 'pull', remote, local]);
  return local;
}
