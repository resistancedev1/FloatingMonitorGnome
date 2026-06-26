/**
 * Floating System Monitor — preferences UI.
 *
 * Provides a panel inside GNOME Extensions to configure widget
 * position, pin state, and update interval.
 */
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class FloatingMonitorPreferences extends ExtensionPreferences {

    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        // Keep a reference so bindings survive
        window._settings = settings;

        // ── Position page ──────────────────────────────
        const posPage = new Adw.PreferencesPage({
            title: 'Position',
            icon_name: 'preferences-desktop-display-symbolic',
        });
        window.add(posPage);

        const posGroup = new Adw.PreferencesGroup({
            title: 'Widget Placement',
            description: 'Set where the widget appears on screen.\nUse -1 for automatic bottom-right positioning.',
        });
        posPage.add(posGroup);

        // X position
        const spinX = new Adw.SpinRow({
            title: 'Horizontal position (X)',
            subtitle: 'Pixels from the left edge of the primary monitor.\n-1 = auto (bottom-right corner).',
            adjustment: new Gtk.Adjustment({
                lower: -1,
                upper: 7680,
                step_increment: 10,
                page_increment: 100,
            }),
            snap_to_ticks: true,
            numeric: true,
        });
        settings.bind('position-x', spinX, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        posGroup.add(spinX);

        // Y position
        const spinY = new Adw.SpinRow({
            title: 'Vertical position (Y)',
            subtitle: 'Pixels from the top edge of the primary monitor.\n-1 = auto (bottom-right corner).',
            adjustment: new Gtk.Adjustment({
                lower: -1,
                upper: 4320,
                step_increment: 10,
                page_increment: 100,
            }),
            snap_to_ticks: true,
            numeric: true,
        });
        settings.bind('position-y', spinY, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        posGroup.add(spinY);

        // Margin
        const spinMargin = new Adw.SpinRow({
            title: 'Screen margin',
            subtitle: 'Minimum distance from screen edges in pixels.',
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 500,
                step_increment: 5,
                page_increment: 25,
            }),
            value: 20,
            snap_to_ticks: true,
            numeric: true,
        });
        settings.bind('margin', spinMargin, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        posGroup.add(spinMargin);

        // ── Behavior page ──────────────────────────────
        const behPage = new Adw.PreferencesPage({
            title: 'Behavior',
            icon_name: 'preferences-system-symbolic',
        });
        window.add(behPage);

        const behGroup = new Adw.PreferencesGroup({
            title: 'Interaction',
        });
        behPage.add(behGroup);

        // Pinned switch
        const switchPin = new Adw.SwitchRow({
            title: 'Pin widget',
            subtitle: 'When enabled, the widget is locked in place and cannot be dragged.',
        });
        settings.bind('pinned', switchPin, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        behGroup.add(switchPin);

        // Update interval
        const spinInterval = new Adw.SpinRow({
            title: 'Update interval',
            subtitle: 'How often metrics refresh, in milliseconds.\nLower = smoother but more CPU usage.',
            adjustment: new Gtk.Adjustment({
                lower: 250,
                upper: 5000,
                step_increment: 250,
                page_increment: 500,
            }),
            value: 1000,
            snap_to_ticks: true,
            numeric: true,
        });
        settings.bind('update-interval', spinInterval, 'value',
            Gio.SettingsBindFlags.DEFAULT);

        const perfGroup = new Adw.PreferencesGroup({
            title: 'Performance',
        });
        perfGroup.add(spinInterval);
        behPage.add(perfGroup);
    }
}
