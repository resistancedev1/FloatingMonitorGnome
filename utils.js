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
