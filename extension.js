/**
 * Floating System Monitor — GNOME Shell extension entry point.
 *
 * Creates a macOS-style floating widget on the desktop that
 * displays live CPU / RAM / Network sparklines.
 */
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {MonitorWidget} from './monitorWidget.js';

export default class FloatingMonitorExtension extends Extension {

    enable() {
        log('[floating-monitor] enabling');
        this._widget = new MonitorWidget(this);
    }

    disable() {
        log('[floating-monitor] disabling');
        if (this._widget) {
            this._widget.destroy();
            this._widget = null;
        }
    }
}
