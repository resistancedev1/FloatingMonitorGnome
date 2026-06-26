/**
 * Floating System Monitor — sparkline mini-chart.
 *
 * Subclass of St.DrawingArea; renders a filled area-chart
 * of the last N data points using Cairo.
 */
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import GObject from 'gi://GObject';

/* Cairo operator constants (numeric — avoids ``imports.cairo`` in ESM). */
const CAIRO_OPERATOR_OVER  = 2;   // Cairo.Operator.OVER
const CAIRO_OPERATOR_CLEAR = 0;   // Cairo.Operator.CLEAR

export const Sparkline = GObject.registerClass(
class Sparkline extends St.DrawingArea {

    /**
     * @param {number}  maxPoints - ring-buffer length (e.g. 60)
     * @param {string}  color     - CSS hex colour, e.g. '#4fc3f7'
     * @param {number}  [width=130]
     * @param {number}  [height=30]
     */
    _init(maxPoints, color, width = 130, height = 30) {
        super._init({
            width,
            height,
            style_class: 'sparkline',
        });
        this._maxPoints = maxPoints;
        this._color     = color;
        this._data      = [];          // ring buffer, newest at end

        this.connect('repaint', this._onRepaint.bind(this));
    }

    /** Append a value and request a redraw. */
    pushValue(value) {
        if (typeof value !== 'number' || isNaN(value))
            return;
        this._data.push(value);
        if (this._data.length > this._maxPoints)
            this._data.shift();
        this.queue_repaint();
    }

    /* ── private ─────────────────────────────────────── */

    _onRepaint() {
        if (this._data.length < 2)
            return;

        const cr    = this.get_context();
        const width = this.get_width();
        const height = this.get_height();

        if (width <= 0 || height <= 0)
            return;

        // clear the drawing area
        cr.setOperator(CAIRO_OPERATOR_CLEAR);
        cr.paint();

        // find data range
        const maxVal = Math.max(...this._data, 0.1);
        const minVal = Math.min(...this._data, 0);

        const pad   = 2;
        const range = maxVal - minVal || 1;
        const n     = this._data.length;
        const stepX = (width - 2 * pad) / Math.max(n - 1, 1);

        const [r, g, b] = this._parseHexColor(this._color);

        // 1 — filled area
        cr.setOperator(CAIRO_OPERATOR_OVER);
        cr.newPath();
        cr.moveTo(pad, height - pad);                // bottom-left

        for (let i = 0; i < n; i++) {
            const x = pad + i * stepX;
            const norm = (this._data[i] - minVal) / range;
            const y = height - pad - norm * (height - 2 * pad);
            cr.lineTo(x, y);
        }

        cr.lineTo(pad + (n - 1) * stepX, height - pad); // bottom-right
        cr.closePath();

        cr.setSourceRGBA(r / 255, g / 255, b / 255, 0.25);
        cr.fillPreserve();

        // 2 — stroke the polyline
        cr.setSourceRGBA(r / 255, g / 255, b / 255, 0.85);
        cr.setLineWidth(1.5);
        cr.stroke();

        // GJS requires explicit disposal of Cairo context
        cr.$dispose();
    }

    /**
     * Parse '#rrggbb' → [r,g,b].
     */
    _parseHexColor(hex) {
        if (hex.startsWith('#')) {
            const r = parseInt(hex.slice(1, 3), 16) || 255;
            const g = parseInt(hex.slice(3, 5), 16) || 255;
            const b = parseInt(hex.slice(5, 7), 16) || 255;
            return [r, g, b];
        }
        return [255, 255, 255]; // fallback white
    }
});
