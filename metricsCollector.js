/**
 * Floating System Monitor — system-metrics collector.
 *
 * Reads /proc/stat, /proc/meminfo and /proc/net/dev every
 * ``collect()`` call and returns delta-based values.
 */
import GLib from 'gi://GLib';
import {readProcFile} from './utils.js';

export class MetricsCollector {
    constructor() {
        this._prevCpu = null;   // {total, idle}
        this._prevNet = null;   // {rx, tx, timestamp μs}
    }

    /* ── public ─────────────────────────────────────── */

    collect() {
        const cpuPercent = this._readCpuPct();
        const ram         = this._readRam();
        const net         = this._readNetSpeed();
        return {
            cpuPercent,
            ramTotal: ram.total,
            ramUsed:  ram.used,
            ramPercent: ram.total > 0 ? (ram.used / ram.total) * 100 : 0,
            downloadSpeed: net.downloadSpeed,
            uploadSpeed:   net.uploadSpeed,
        };
    }

    /* ── CPU ────────────────────────────────────────── */

    _readCpuRaw() {
        const content = readProcFile('/proc/stat');
        const line = content.split('\n')[0]; // aggregate cpu row
        const parts = line.trim().split(/\s+/);
        // parts[0]="cpu", [1]=user, [2]=nice, [3]=system,
        // [4]=idle, [5]=iowait, [6]=irq, [7]=softirq, [8]=steal
        const user    = parseInt(parts[1]) || 0;
        const nice    = parseInt(parts[2]) || 0;
        const system  = parseInt(parts[3]) || 0;
        const idle    = parseInt(parts[4]) || 0;
        const iowait  = parseInt(parts[5]) || 0;
        const irq     = parseInt(parts[6]) || 0;
        const softirq = parseInt(parts[7]) || 0;
        const steal   = parseInt(parts[8]) || 0;

        const total = user + nice + system + idle + iowait + irq + softirq + steal;
        const idleTotal = idle + iowait + steal;
        return {total, idle: idleTotal};
    }

    _readCpuPct() {
        const cur = this._readCpuRaw();
        let pct = 0;
        if (this._prevCpu) {
            const totalDelta = cur.total - this._prevCpu.total;
            const idleDelta  = cur.idle  - this._prevCpu.idle;
            if (totalDelta > 0)
                pct = ((totalDelta - idleDelta) / totalDelta) * 100;
        }
        this._prevCpu = cur;
        return Math.min(100, Math.max(0, pct));
    }

    /* ── RAM ────────────────────────────────────────── */

    _readRam() {
        const content = readProcFile('/proc/meminfo');
        let total = 0, available = 0;
        for (const line of content.split('\n')) {
            if (line.startsWith('MemTotal:'))
                total = (parseInt(line.match(/\d+/)?.[0]) || 0) * 1024;
            if (line.startsWith('MemAvailable:'))
                available = (parseInt(line.match(/\d+/)?.[0]) || 0) * 1024;
        }
        // fallback for ancient kernels without MemAvailable
        if (!available) {
            let free = 0, buffers = 0, cached = 0, sReclaimable = 0;
            for (const line of content.split('\n')) {
                if (line.startsWith('MemFree:'))
                    free = (parseInt(line.match(/\d+/)?.[0]) || 0) * 1024;
                if (line.startsWith('Buffers:'))
                    buffers = (parseInt(line.match(/\d+/)?.[0]) || 0) * 1024;
                if (line.startsWith('Cached:'))
                    cached = (parseInt(line.match(/\d+/)?.[0]) || 0) * 1024;
                if (line.startsWith('SReclaimable:'))
                    sReclaimable = (parseInt(line.match(/\d+/)?.[0]) || 0) * 1024;
            }
            available = free + buffers + cached + sReclaimable;
        }
        const used = total - available;
        return {total, used, available};
    }

    /* ── Network ────────────────────────────────────── */

    _readNetRaw() {
        const content = readProcFile('/proc/net/dev');
        let rx = 0, tx = 0;
        const lines = content.split('\n');
        for (let i = 2; i < lines.length; i++) { // skip header rows
            const line = lines[i].trim();
            if (!line) continue;
            const colonIdx = line.indexOf(':');
            if (colonIdx === -1) continue;
            const iface = line.substring(0, colonIdx).trim();
            if (iface === 'lo') continue;           // loopback
            if (iface.startsWith('lxc')) continue;  // LXC bridges
            if (iface.startsWith('veth')) continue; // virtual ethernet
            const fields = line.substring(colonIdx + 1).trim().split(/\s+/);
            rx += parseInt(fields[0]) || 0;  // bytes received
            tx += parseInt(fields[8]) || 0;  // bytes transmitted
        }
        return {rx, tx, ts: GLib.get_monotonic_time()};
    }

    _readNetSpeed() {
        const cur = this._readNetRaw();
        let downloadSpeed = 0, uploadSpeed = 0;
        if (this._prevNet && this._prevNet.ts > 0) {
            const dt = (cur.ts - this._prevNet.ts) / 1_000_000; // seconds
            if (dt > 0) {
                downloadSpeed = Math.max(0, (cur.rx - this._prevNet.rx) / dt);
                uploadSpeed   = Math.max(0, (cur.tx - this._prevNet.tx) / dt);
            }
        }
        this._prevNet = cur;
        return {downloadSpeed, uploadSpeed};
    }
}
