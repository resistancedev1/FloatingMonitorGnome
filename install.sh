#!/usr/bin/env bash
#
# Floating System Monitor — install script.
#
# Copies extension files to the GNOME extensions directory,
# compiles GSettings schemas, and enables the extension.
#
set -euo pipefail

UUID="floating-monitor@local"
EXT_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"
SCHEMA_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}/schemas"

echo "==> Installing Floating System Monitor to ${EXT_DIR}"

# 1. Copy files
mkdir -p "${EXT_DIR}"
cp -v metadata.json extension.js monitorWidget.js \
      metricsCollector.js sparkline.js utils.js \
      stylesheet.css prefs.js \
      "${EXT_DIR}/"

# 2. Copy & compile GSettings schemas
mkdir -p "${SCHEMA_DIR}"
cp -v schemas/*.xml "${SCHEMA_DIR}/"
glib-compile-schemas "${SCHEMA_DIR}"

echo "==> Schema compiled"

# 3. Enable the extension (skip if gnome-shell isn't running)
if command -v gnome-extensions &>/dev/null; then
    gnome-extensions enable "${UUID}" 2>/dev/null || true
    echo "==> Extension enabled (restart GNOME Shell if already running)"
else
    echo "==> NOTE: gnome-extensions not found — enable the extension manually"
fi

echo ""
echo "Done!  Restart GNOME Shell to load the extension:"
echo "  Wayland: log out and back in"
echo "  X11:     Alt+F2, type 'r', press Enter"
echo ""
echo "Then open GNOME Extensions → Floating System Monitor → Preferences"
echo "to configure position and behaviour."
