# Floating System Monitor

A macOS-style floating system monitor widget for GNOME Shell 48.  
Displays live **CPU**, **RAM**, and **Network** metrics with animated sparkline graphs — inspired by btop.

![widget preview](screenshot.png)

## Features

- **Wallpaper-level** — sits behind all windows, always visible on your desktop
- **Draggable** — click and drag anywhere on screen (unpin first); position persists across sessions
- **GNOME Extensions settings** — configure position, margin, pin state, and update interval from the GUI
- **Live sparklines** — 60-second area charts for each metric
- **macOS aesthetic** — frosted glass background, rounded corners, soft shadows
- **Lightweight** — reads `/proc` directly, no external dependencies beyond GNOME Shell

## Settings

Open **GNOME Extensions** → **Floating System Monitor** → **Preferences**:

| Setting | Description | Default |
|---|---|---|
| Horizontal position (X) | Pixels from left edge (-1 = auto) | -1 |
| Vertical position (Y) | Pixels from top edge (-1 = auto) | -1 |
| Screen margin | Minimum distance from edges | 20 px |
| Pin widget | Lock widget in place | On |
| Update interval | Metrics refresh rate (ms) | 1000 |

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
# Quick install
./install.sh
```

### Manual install

```bash
# 1. Copy files to the GNOME extensions directory
EXT_DIR=~/.local/share/gnome-shell/extensions/floating-monitor@local
mkdir -p "$EXT_DIR"
cp metadata.json extension.js monitorWidget.js \
   metricsCollector.js sparkline.js utils.js \
   stylesheet.css prefs.js \
   "$EXT_DIR/"

# 2. Install & compile GSettings schema
mkdir -p "$EXT_DIR/schemas"
cp schemas/*.xml "$EXT_DIR/schemas/"
glib-compile-schemas "$EXT_DIR/schemas/"

# 3. Restart GNOME Shell
#    Wayland: log out and back in
#    X11:     Alt+F2, type 'r', press Enter

# 4. Enable the extension
gnome-extensions enable floating-monitor@local
```

### Usage

- The widget appears in the **bottom-right corner** of your primary monitor
- **Unpin** it (click the lock icon) then **drag** anywhere on screen
- Position is automatically saved and restored on next login
- Configure everything from **GNOME Extensions** → **Preferences**

## Troubleshooting

Check logs for errors:
```bash
journalctl -f -o cat /usr/bin/gnome-shell | grep floating-monitor
```

Debug GSettings:
```bash
gsettings list-recursively org.gnome.shell.extensions.floating-monitor
gsettings reset org.gnome.shell.extensions.floating-monitor position-x
```

## File Structure

```
floating-monitor@local/
├── metadata.json          # Extension metadata (UUID, version, GNOME 48)
├── extension.js           # Entry point — enable() / disable()
├── monitorWidget.js       # Main widget — layout, drag, update loop
├── metricsCollector.js    # /proc reader — CPU, RAM, Network delta calc
├── sparkline.js           # St.DrawingArea + Cairo sparkline renderer
├── utils.js               # Formatters, clamp helper
├── stylesheet.css         # macOS aesthetic styles
├── prefs.js               # GNOME Extensions preferences panel
├── schemas/
│   └── org.gnome.shell.extensions.floating-monitor.gschema.xml
├── install.sh             # One-command install script
└── README.md              # This file
```

## License

MIT
