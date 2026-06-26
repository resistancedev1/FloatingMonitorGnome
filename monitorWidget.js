/**
 * Floating System Monitor — main widget.
 *
 * A floating, draggable macOS-style panel that shows CPU, RAM
 * and network metrics with live sparkline graphs.
 */
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {MetricsCollector} from './metricsCollector.js';
import {Sparkline} from './sparkline.js';
import {
    formatBytes,
    formatSpeed,
    loadPosition,
    savePosition,
    loadPinnedState,
    savePinnedState,
    clamp,
} from './utils.js';

/* ── Sparkline colours ────────────────────────────────── */
const CPU_COL = '#4fc3f7';   // light blue
const RAM_COL = '#81c784';   // soft green
const NET_COL = '#ffb74d';   // warm amber

/* ── Sparkline data window ────────────────────────────── */
const SPARKLINE_POINTS = 60;

/* ── Update interval ──────────────────────────────────── */
const UPDATE_MS = 1000;

export class MonitorWidget {

    constructor(extension) {
        this._extension = extension;
        this._collector = new MetricsCollector();
        this._dragging  = false;
        this._dragOffX  = 0;
        this._dragOffY  = 0;
        this._updateId  = 0;
        this._capturedId = 0;
        this._windowGroupId = 0;

        // Load pinned state — default to pinned (locked)
        this._pinned = loadPinnedState();

        this._buildUi();
        this._loadStylesheet();
        this._loadPosition();
        this._startDrag();
        this._startUpdates();
    }

    /* ── UI construction ─────────────────────────────── */

    _buildUi() {
        // root container
        this.actor = new St.BoxLayout({
            style_class: 'floating-monitor',
            vertical: true,
            reactive: true,
        });
        this.actor.connect('destroy', this._onDestroy.bind(this));

        // ── header with pin button ──
        const headerRow = new St.BoxLayout({
            vertical: false,
            style_class: 'widget-header-row',
        });

        const titleLabel = new St.Label({
            text: 'System Monitor',
            style_class: 'widget-header',
            y_align: Clutter.ActorAlign.CENTER,
        });
        headerRow.add_child(titleLabel);

        // spacer pushes pin button to the right
        const headerSpacer = new St.Bin({xExpand: true});
        headerRow.add_child(headerSpacer);

        // pin toggle button
        this._pinBtn = new St.Button({
            style_class: 'pin-button',
            can_focus: false,
            reactive: true,
            toggle_mode: false,
        });
        this._pinBtn.child = new St.Icon({
            icon_name: this._pinned ? 'changes-prevent-symbolic' : 'changes-allow-symbolic',
            style_class: 'pin-icon',
            icon_size: 12,
        });
        this._pinBtn.connect('clicked', this._togglePin.bind(this));
        headerRow.add_child(this._pinBtn);

        this.actor.add_child(headerRow);

        // ── CPU row ──
        this._cpuSparkline = new Sparkline(SPARKLINE_POINTS, CPU_COL);
        this._cpuLabel     = new St.Label({text: 'CPU 0%', style_class: 'metric-value'});
        const cpuRow = this._buildRow(
            'cpu-symbolic',
            'CPU',
            this._cpuLabel,
            this._cpuSparkline
        );
        this.actor.add_child(cpuRow);

        // ── RAM row ──
        this._ramSparkline = new Sparkline(SPARKLINE_POINTS, RAM_COL);
        this._ramLabel     = new St.Label({text: 'RAM --', style_class: 'metric-value'});
        const ramRow = this._buildRow(
            'memory-symbolic',     // might fallback to generic
            'RAM',
            this._ramLabel,
            this._ramSparkline
        );
        this.actor.add_child(ramRow);

        // ── Network row ──
        this._netSparkline = new Sparkline(SPARKLINE_POINTS, NET_COL);
        this._netLabel     = new St.Label({text: 'NET --', style_class: 'metric-value'});
        const netRow = this._buildRow(
            'network-wired-symbolic',
            'NET',
            this._netLabel,
            this._netSparkline
        );
        this.actor.add_child(netRow);

        // ── place behind all windows (wallpaper level) ──
        this._addToBackground();
    }

    /**
     * Add widget below all windows — on the wallpaper level.
     * Uses window_group so the widget sits between the background
     * and application windows.
     */
    _addToBackground() {
        global.window_group.add_child(this.actor);
        this.actor.lower_bottom();

        // Re-lower whenever a new window actor is added,
        // ensuring our widget always stays behind everything.
        this._windowGroupId = global.window_group.connect(
            'actor-added',
            () => {
                this.actor.lower_bottom();
            }
        );
    }

    /**
     * Build one horizontal metric row:
     *   [icon] [name label] ... [value label] ... [sparkline]
     */
    _buildRow(iconName, title, valueLabel, sparkline) {
        const row = new St.BoxLayout({
            style_class: 'metric-row',
            vertical: false,
        });

        // icon
        const icon = new St.Icon({
            icon_name: iconName,
            style_class: 'metric-icon',
            fallback_icon_name: 'application-x-executable-symbolic',
        });
        row.add_child(icon);

        // name
        const nameLabel = new St.Label({
            text: title,
            style_class: 'metric-name',
        });
        row.add_child(nameLabel);

        // spacer (pushes value + sparkline right)
        const spacer = new St.Bin({style_class: 'metric-spacer', xExpand: true});
        row.add_child(spacer);

        // value
        row.add_child(valueLabel);

        // sparkline
        row.add_child(sparkline);

        return row;
    }

    /* ── Stylesheet ──────────────────────────────────── */

    _loadStylesheet() {
        try {
            const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
            const cssPath = Gio.File.new_for_path(
                `${this._extension.path}/stylesheet.css`
            );
            if (cssPath.query_exists(null))
                theme.load_stylesheet(cssPath);
        } catch (e) {
            log('[floating-monitor] failed to load stylesheet: ' + e);
        }
    }

    /* ── Position ────────────────────────────────────── */

    _loadPosition() {
        const saved = loadPosition();
        const mon = global.display.get_monitor_geometry(
            global.display.get_primary_monitor()
        );
        const margin = 20;

        // measure natural size first (force relayout)
        let [minW, natW] = [0, 0];
        let [minH, natH] = [0, 0];
        this.actor.get_preferred_width(-1, minW, natW);
        this.actor.get_preferred_height(-1, minH, natH);
        const w = natW > 0 ? this.actor.get_width() : 220;
        const h = natH > 0 ? this.actor.get_height() : 150;

        let x, y;
        if (saved.x >= 0 && saved.y >= 0) {
            x = saved.x;
            y = saved.y;
        } else {
            // bottom-right corner
            x = mon.x + mon.width  - w - margin;
            y = mon.y + mon.height - h - margin;
        }

        // clamp to visible area
        x = clamp(x, mon.x, mon.x + mon.width  - margin);
        y = clamp(y, mon.y, mon.y + mon.height - margin);

        this.actor.set_position(x, y);

        // re-clamp on monitor changes
        this._monitorChangedId = Main.layoutManager.connect(
            'monitors-changed',
            this._onMonitorsChanged.bind(this)
        );
    }

    _savePosition() {
        savePosition(this.actor.x, this.actor.y);
    }

    _onMonitorsChanged() {
        const mon = global.display.get_monitor_geometry(
            global.display.get_primary_monitor()
        );
        this.actor.set_position(
            clamp(this.actor.x, mon.x, mon.x + mon.width  - 50),
            clamp(this.actor.y, mon.y, mon.y + mon.height - 50)
        );
    }

    /* ── Pin toggle ──────────────────────────────────── */

    _togglePin() {
        this._pinned = !this._pinned;
        savePinnedState(this._pinned);

        // Update icon
        this._pinBtn.child.icon_name = this._pinned
            ? 'changes-prevent-symbolic'
            : 'changes-allow-symbolic';

        // If just pinned, save current position as pinned location
        if (this._pinned) {
            this._savePosition();
        }

        log(`[floating-monitor] ${this._pinned ? 'pinned' : 'unpinned'}`);
    }

    /* ── Drag ────────────────────────────────────────── */

    _startDrag() {
        this._capturedId = global.stage.connect(
            'captured-event',
            this._onCapturedEvent.bind(this)
        );
    }

    _onCapturedEvent(actor, event) {
        const type = event.type();

        if (type === Clutter.EventType.BUTTON_PRESS) {
            const [x, y] = event.get_coords();
            if (this._hitTest(x, y)) {
                // Ignore drag when pinned (but let the pin button work via normal event path)
                if (this._pinned)
                    return Clutter.EVENT_PROPAGATE;

                this._dragOffX = x - this.actor.x;
                this._dragOffY = y - this.actor.y;
                this._dragging = true;
                return Clutter.EVENT_STOP;
            }
        }

        if (type === Clutter.EventType.MOTION && this._dragging) {
            const [x, y] = event.get_coords();
            this.actor.set_position(
                Math.round(x - this._dragOffX),
                Math.round(y - this._dragOffY)
            );
            return Clutter.EVENT_STOP;
        }

        if (type === Clutter.EventType.BUTTON_RELEASE && this._dragging) {
            this._dragging = false;
            this._savePosition();
            return Clutter.EVENT_STOP;
        }

        return Clutter.EVENT_PROPAGATE;
    }

    /** Check whether stage-relative point (px,py) is inside our widget. */
    _hitTest(px, py) {
        const [ok, ax, ay] = this.actor.transform_stage_point(px, py);
        if (!ok) return false;
        return (
            ax >= 0 && ax <= this.actor.width &&
            ay >= 0 && ay <= this.actor.height
        );
    }

    /* ── Update loop ─────────────────────────────────── */

    _startUpdates() {
        this._collector.collect();  // prime the first reading (seeds deltas)
        this._updateId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            UPDATE_MS,
            this._update.bind(this)
        );
    }

    _update() {
        try {
            const m = this._collector.collect();

            // CPU
            this._cpuLabel.text = `${m.cpuPercent.toFixed(0)}%`;
            this._cpuSparkline.pushValue(m.cpuPercent);

            // RAM
            this._ramLabel.text =
                `${formatBytes(m.ramUsed)} / ${formatBytes(m.ramTotal)}`;
            this._ramSparkline.pushValue(m.ramPercent);

            // Network — normalise to 0..100 range for the sparkline
            const totalSpeed = m.downloadSpeed + m.uploadSpeed;
            // scale: 1 MiB/s ≈ 100 on the chart
            const netNorm = Math.min(100, (totalSpeed / (1024 * 1024)) * 100);
            this._netSparkline.pushValue(netNorm);

            // label
            this._netLabel.text =
                `▼${formatSpeed(m.downloadSpeed)}  ▲${formatSpeed(m.uploadSpeed)}`;
        } catch (e) {
            log('[floating-monitor] update error: ' + e);
        }

        return GLib.SOURCE_CONTINUE;
    }

    /* ── Cleanup ─────────────────────────────────────── */

    _onDestroy() {
        this.destroy();
    }

    destroy() {
        if (this._updateId) {
            GLib.Source.remove(this._updateId);
            this._updateId = 0;
        }
        if (this._capturedId) {
            global.stage.disconnect(this._capturedId);
            this._capturedId = 0;
        }
        if (this._monitorChangedId) {
            Main.layoutManager.disconnect(this._monitorChangedId);
            this._monitorChangedId = 0;
        }
        if (this._windowGroupId) {
            global.window_group.disconnect(this._windowGroupId);
            this._windowGroupId = 0;
        }
        this._savePosition();
        this._collector = null;
        // children are destroyed with actor
        if (this.actor) {
            this.actor.destroy();
            this.actor = null;
        }
    }
}
