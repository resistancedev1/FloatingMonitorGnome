/**
 * Floating System Monitor — utility helpers.
 */
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

/* ── byte / speed formatting ───────────────────────────── */

export function formatBytes(bytes) {
    if (bytes < 0) bytes = 0;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let value = bytes;
    while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i++;
    }
    return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatSpeed(bytesPerSec) {
    if (bytesPerSec < 1024)
        return `${bytesPerSec.toFixed(0)} B/s`;
    if (bytesPerSec < 1024 * 1024)
        return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

/* ── position persistence ──────────────────────────────── */

const STATE_DIR = `${GLib.get_user_state_dir()}/floating-monitor`;
const POSITION_FILE = `${STATE_DIR}/position.json`;
const CONFIG_FILE = `${STATE_DIR}/config.json`;

export function loadPosition() {
    try {
        const dir = Gio.File.new_for_path(STATE_DIR);
        if (!dir.query_exists(null))
            return {x: -1, y: -1};

        const file = Gio.File.new_for_path(POSITION_FILE);
        if (!file.query_exists(null))
            return {x: -1, y: -1};

        const [ok, contents] = file.load_contents(null);
        if (!ok) return {x: -1, y: -1};

        const text = new TextDecoder('utf-8').decode(contents);
        return JSON.parse(text);
    } catch (_e) {
        return {x: -1, y: -1};
    }
}

export function savePosition(x, y) {
    try {
        const dir = Gio.File.new_for_path(STATE_DIR);
        if (!dir.query_exists(null))
            dir.make_directory_with_parents(null);

        const data = JSON.stringify({x, y});
        const file = Gio.File.new_for_path(POSITION_FILE);
        file.replace_contents(
            new TextEncoder().encode(data),
            null, false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null
        );
    } catch (_e) {
        // silently fail — position just won't persist
    }
}

/* ── file I/O ──────────────────────────────────────────── */

export function readProcFile(path) {
    const file = Gio.File.new_for_path(path);
    const [ok, contents] = file.load_contents(null);
    if (!ok) return '';
    return new TextDecoder('utf-8').decode(contents);
}

/* ── clamp ─────────────────────────────────────────────── */

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/* ── pinned state persistence ──────────────────────────── */

export function loadPinnedState() {
    try {
        const dir = Gio.File.new_for_path(STATE_DIR);
        if (!dir.query_exists(null))
            return true;  // default to pinned

        const file = Gio.File.new_for_path(CONFIG_FILE);
        if (!file.query_exists(null))
            return true;

        const [ok, contents] = file.load_contents(null);
        if (!ok) return true;

        const config = JSON.parse(new TextDecoder('utf-8').decode(contents));
        return config.pinned !== false;  // default true
    } catch (_e) {
        return true;
    }
}

export function savePinnedState(pinned) {
    try {
        const dir = Gio.File.new_for_path(STATE_DIR);
        if (!dir.query_exists(null))
            dir.make_directory_with_parents(null);

        // Read existing config or start fresh
        let config = {};
        const file = Gio.File.new_for_path(CONFIG_FILE);
        if (file.query_exists(null)) {
            const [ok, contents] = file.load_contents(null);
            if (ok) {
                try {
                    config = JSON.parse(new TextDecoder('utf-8').decode(contents));
                } catch (_e) { /* use empty */ }
            }
        }

        config.pinned = pinned;

        file.replace_contents(
            new TextEncoder().encode(JSON.stringify(config)),
            null, false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null
        );
    } catch (_e) {
        // silently fail
    }
}
