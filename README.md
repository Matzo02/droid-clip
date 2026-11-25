# droid-clip

> Screenshot on your Android, paste on your laptop. A tiny ADB-powered clipboard bridge for AI workflows.

[![npm version](https://img.shields.io/npm/v/droid-clip.svg?style=flat-square)](https://www.npmjs.com/package/droid-clip)
[![npm downloads](https://img.shields.io/npm/dw/droid-clip.svg?style=flat-square)](https://www.npmjs.com/package/droid-clip)
[![CI](https://img.shields.io/github/actions/workflow/status/Matzo02/droid-clip/ci.yml?branch=main&style=flat-square)](https://github.com/Matzo02/droid-clip/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](./LICENSE)
[![Node](https://img.shields.io/node/v/droid-clip.svg?style=flat-square)](https://nodejs.org)

<p align="center">
  <img src="./demo/phone.gif" width="280" alt="taking a screenshot on the Android phone" />
</p>

<p align="center">
  <img src="./demo/daemon.gif" width="640" alt="droid-clip daemon output in the terminal" />
</p>

<p align="center">
  <img src="./demo/paste.gif" width="640" alt="screenshot pasted into a Claude Code chat" />
</p>

```bash
npx droid-clip
```

Take a screenshot on your USB-connected Android phone and within ~1 second it lands on your laptop clipboard, ready to paste into Claude Code, ChatGPT, Cursor, Discord, anywhere.

## Why

Mobile devs (especially Expo / React Native) hit UI bugs on-device that need AI debugging help. The usual flow is 30–60s of friction per screenshot: take it → AirDrop / email / drag it over → find the file → drag it into chat. `droid-clip` cuts that to one `Cmd+V` / `Ctrl+V`.

The clipboard is the integration point on purpose. Every paste-capable tool accepts images, so this works with all of them without needing any plugin or MCP support on the AI side.

## Install / Run

```bash
npx droid-clip
```

No install, no config file, no signup. Stop with `Ctrl+C`.

## Prerequisites

- **Node.js 18+**
- **`adb`** on your `PATH` (install via [Android Platform Tools](https://developer.android.com/tools/releases/platform-tools))
- A USB-connected Android phone with **USB debugging** enabled in Developer Options
- On **Linux** only: `xclip`
  - Debian / Ubuntu: `sudo apt install xclip`
  - Fedora: `sudo dnf install xclip`
  - Arch: `sudo pacman -S xclip`

## Supported platforms

| OS      | Status        | Notes                          |
|---------|---------------|--------------------------------|
| Windows | ✅ Tested     | PowerShell with `-STA` flag    |
| macOS   | ⚠️ Unverified | Uses `osascript`. Should work, needs someone to confirm. |
| Linux   | ⚠️ Unverified | X11 only, needs `xclip`. Wayland not supported. |

## Usage

1. Plug your phone in via USB.
2. Accept the "Allow USB debugging" prompt on the phone.
3. Run `npx droid-clip`.
4. Take a screenshot on the phone. It's on your clipboard.

That's the whole app.

If no authorized device is available, check `adb devices` and accept the debugging prompt on your phone. With multiple devices, set `ANDROID_SERIAL` to the serial from `adb devices` to keep the watcher on one device.

## FAQ

**What gets captured?** Whatever your phone saves into its screenshot folder. `droid-clip` probes the common paths at startup (`/sdcard/Pictures/Screenshots/` for Pixel/stock, `/sdcard/DCIM/Screenshots/` for Samsung, `/sdcard/Screenshots/` for some older ROMs) and uses whichever one your device has. If your phone stores them somewhere else, open an issue with your model name and we'll add the path.

**Does it send anything to the cloud?** No. The screenshot goes phone → USB → your OS temp dir (`/tmp/droid-clip/` on macOS/Linux, `%TEMP%\droid-clip\` on Windows) → your clipboard. That's it.

**Wireless ADB?** If your phone is paired over Wi-Fi ADB, it works exactly the same. `adb` is `adb`.

**iOS?** Not in v1. Tracked as a phase-2 idea (likely Tailscale + an iOS Shortcut), but it's a very different story from USB+ADB.

## Development

```bash
git clone https://github.com/Matzo02/droid-clip.git
cd droid-clip
npm install
npm run build
npm start
```

## Contributing

Issues and PRs welcome. Especially bug reports with your phone model + Android version if the screenshot path on your device is different.

## License

[MIT](./LICENSE)
