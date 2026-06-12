# Screen Deck

A customizable touchscreen macro pad (Stream Deck style) for a portable touch monitor.
runs on **macOS & Windows**.

## Run

```bash
npm install      # once
npm start        # launch
npm run dev      # launch + DevTools (debug)
```

The app opens as a normal window first. Open **⚙️ Settings** → pick your touch
monitor → **Apply** to move it there and go fullscreen. Press **Esc** to exit
fullscreen anytime.

## Use

- **Tap a button** → runs its action. A folder button opens another page.
- **✏️ Edit** → edit mode. Tap any button to configure it; tap an empty cell (＋)
  to create one. In edit mode you can also add (＋), rename (✎), or delete (🗑) pages.
- **Page tabs** (below the toolbar) → switch between pages.
- **⚙️ Settings** → grid size (columns/rows) and which display to use.

## Action types

| Type          | Example value                  | Notes                                  |
|---------------|--------------------------------|----------------------------------------|
| Open App      | `Finder`, `Spotify`            | Launch an application                  |
| Open URL      | `https://youtube.com`          | Open in default browser                |
| Open File     | `/Users/you/Documents`         | Open a file/folder                     |
| Hotkey        | `cmd+c`, `ctrl+shift+t`, `alt+tab` | Simulate a keystroke combo (nut-js) |
| Type Text     | `Hello world!`                 | Type a string of text                  |
| Run Shell     | `open -a Calculator`           | Run a shell command                    |
| AppleScript   | `display notification "Hi"`    | macOS only                             |
| Open Folder   | (pick a page)                  | Navigate to another page               |

### Hotkey syntax
Combine tokens with `+`. Modifiers: `cmd`/`win`, `ctrl`, `alt`/`option`, `shift`.
Keys: letters `a–z`, digits `0–9`, `f1–f24`, and `enter space tab esc backspace
delete up down left right home end pageup pagedown comma period minus equal`.
Examples: `cmd+space`, `ctrl+alt+delete`, `cmd+shift+4`.

## Icons
Each button can use an **emoji**, an **uploaded image** (PNG/JPG/GIF/ICO), the
**real app icon** (auto-set via the App Picker), or a **GIF from GIPHY** (in-app
search). All images are stored inline in the config as data URLs, so the config
is fully portable across machines. Per-button **icon size** slider + **transparent
background** option, with a live preview in the editor.

**GIF search** needs a free GIPHY API key (developers.giphy.com) pasted into
**⚙️ Settings → GIPHY API key**.

## Monitor page (PC stats)
A page can be a **monitor** instead of a button grid — a live system dashboard
(clock, CPU load/clock/temp, GPU load/clock/temp, RAM, network up/down, disk %),
styled like NZXT CAM / AIDA64. In edit mode, the page strip has a **＋ (deck page)**
and a **CPU icon (＋ monitor page)**. Swipe between pages as usual.

Metrics use `systeminformation`. On Windows, GPU temp/load come from `nvidia-smi`
(NVIDIA). CPU temperature and fan RPM are often unavailable without a sensor
backend (LibreHardwareMonitor / admin) and show as "—".

## Config
Saved at `userData/screen-deck-config.json` (v2 schema: `pages → buttons`).
Old flat-button configs are migrated automatically.

## Notes per platform

- **Windows**: USB touchscreens work natively (HID touch) — no extra driver needed.
- **macOS**: macOS has no built-in driver for generic USB touchscreens. Touch
  requires a translator like **UPDD** (Touch-Base), which needs its Driver
  Extension approved in *System Settings → General → Login Items & Extensions →
  Driver Extensions*, plus Accessibility + Input Monitoring permissions. On a
  managed/corporate Mac this may be blocked by MDM.
- **Hotkey / Type actions** on macOS need Accessibility permission for the app.

## Roadmap ideas
- Per-app auto profiles (switch page based on the active app)
- Button drag-to-reorder
- Brightness/scheduling, multi-action sequences
