# Floating System Monitor

A macOS-style floating system monitor widget for GNOME Shell 48.  
Displays live **CPU**, **RAM**, and **Network** metrics with animated sparkline graphs — inspired by btop.

![widget preview](screenshot.png)

## Features

- **Floating on desktop** — not in the panel, always visible on your workspace
- **Draggable** — click and drag anywhere on screen; position persists across sessions
- **Live sparklines** — 60-second area charts for each metric
- **macOS aesthetic** — frosted glass background, rounded corners, soft shadows
- **Lightweight** — reads `/proc` directly, no external dependencies beyond GNOME Shell

## Metrics

| Metric   | Source             | Display                                  |
|----------|--------------------|------------------------------------------|
| CPU      | `/proc/stat`       | Percentage + blue sparkline              |
| RAM      | `/proc/meminfo`    | Used / Total + green sparkline           |
| Network  | `/proc/net/dev`    | Download / Upload speeds + amber sparkline |

## Requirements

- **GNOME Shell 48** (Wayland or X11)
- **GNOME Shell Extensions** enabled

No additional packages required — the extension reads system information directly from `/proc`.

## Installation

```bash
# 1. Copy files to the GNOME extensions directory
mkdir -p ~/.local/share/gnome-shell/extensions/floating-monitor@local
cp metadata.json extension.js monitorWidget.js \
   metricsCollector.js sparkline.js utils.js \
   stylesheet.css \
   ~/.local/share/gnome-shell/extensions/floating-monitor@local/

# 2. Restart GNOME Shell
#    Wayland: log out and back in
#    X11:     Alt+F2, type 'r', press Enter

# 3. Enable the extension
gnome-extensions enable floating-monitor@local
```

Or use **GNOME Extensions** app to enable it from the GUI.

## Usage

- The widget appears in the **bottom-right corner** of your primary monitor
- **Drag** it anywhere on screen
- Position is automatically saved and restored on next login
- The widget stays on the desktop layer (behind application windows)

## Troubleshooting

Check logs for errors:
```bash
journalctl -f -o cat /usr/bin/gnome-shell | grep floating-monitor
```

## File Structure

```
floating-monitor@local/
├── metadata.json          # Extension metadata (UUID, version, GNOME 48)
├── extension.js           # Entry point — enable() / disable()
├── monitorWidget.js       # Main widget — layout, drag, update loop
├── metricsCollector.js    # /proc reader — CPU, RAM, Network delta calc
├── sparkline.js           # St.DrawingArea + Cairo sparkline renderer
├── utils.js               # Formatters, position persistence helpers
├── stylesheet.css         # macOS aesthetic styles
└── README.md              # This file
```

## License

MIT
