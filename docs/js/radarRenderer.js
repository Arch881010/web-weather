/**
 * Client-side NEXRAD radar renderer for Leaflet.
 * Renders radar sweep data as canvas tiles for pixel-perfect display at
 * any zoom level — the "Attic Radar" approach: each tile draws the actual
 * radar gates that intersect it at the tile's native resolution.
 */

// ── NWS-style Reflectivity Colormap ──
// [dBZ threshold, R, G, B, A]
const NWS_REF_COLORS = [
    [  5,  64, 224, 208, 180],
    [ 10,   1, 159, 244, 200],
    [ 15,   3,   0, 244, 200],
    [ 20,   0, 255,   0, 200],
    [ 25,   0, 200,   0, 200],
    [ 30,   0, 142,   0, 200],
    [ 35, 255, 255,   0, 200],
    [ 40, 229, 188,   0, 200],
    [ 45, 255, 100,   0, 200],
    [ 50, 255,   0,   0, 200],
    [ 55, 214,   0,   0, 200],
    [ 60, 160,   0,   0, 200],
    [ 65, 255,   0, 255, 200],
    [ 70, 128,  64, 192, 200],
    [ 75, 255, 255, 255, 200],
];

// ── NWS-style Velocity Colormap (AtticRadar VEL1 color table) ──
// [normalized (-1..1), R, G, B]
// Derived from the standard NWS velocity gradient:
//   inbound (negative): light pink → hot pink → purple → blue → cyan → green → dark green
//   zero: gray
//   outbound (positive): dark red → red → pink → yellow → orange → brown → black
const NWS_VEL_STOPS = [
    [-1.000, 255, 204, 230],   //   0.00%  light pink (max inbound)
    [-0.857, 252,   0, 130],   //   7.14%  hot pink
    [-0.714, 110,   3, 151],   //  14.29%  purple
    [-0.644,  22,  13, 156],   //  17.86%  dark blue (end of segment)
    [-0.643,  24,  39, 165],   //  17.86%  blue (start of segment)
    [-0.571,  30, 111, 188],   //  21.43%  medium blue
    [-0.500,  44, 213, 223],   //  25.00%  cyan
    [-0.357, 181, 237, 239],   //  32.14%  light cyan
    [-0.286,   3, 238,   3],   //  35.71%  bright green
    [-0.072,   0, 100,   0],   //  46.43%  dark green (end of segment)
    [-0.071,  78, 121,  76],   //  46.43%  olive gray (start of segment)
    [-0.001, 116, 131, 112],   //  50.00%  gray-green (zero left)
    [ 0.001, 137, 117, 122],   //  50.00%  gray-red (zero right)
    [ 0.070, 130,  51,  59],   //  53.57%  red-brown (end of segment)
    [ 0.071, 109,   0,   0],   //  53.57%  dark red (start of segment)
    [ 0.285, 242,   0,   7],   //  64.29%  red (end of segment)
    [ 0.286, 249,  51,  76],   //  64.29%  red-pink (start of segment)
    [ 0.393, 254, 155, 204],   //  69.64%  pink
    [ 0.429, 254, 230, 166],   //  71.43%  light yellow
    [ 0.571, 254, 146,  82],   //  78.57%  orange
    [ 0.857, 110,  14,   9],   //  92.86%  dark brown
    [ 1.000,   0,   0,   0],   // 100.00%  black (max outbound)
];

// ── Blue-Red Velocity Colormap ──
const BLUE_RED_VEL_STOPS = [
    [-1.00,   0,   0, 245],
    [-0.75,   0,  60, 200],
    [-0.50,   0, 120, 180],
    [-0.30,  60, 160, 220],
    [-0.15, 140, 200, 240],
    [-0.03, 200, 200, 200],
    [ 0.03, 200, 200, 200],
    [ 0.15, 240, 180, 140],
    [ 0.30, 220, 140,  80],
    [ 0.50, 200,  80,  40],
    [ 0.75, 180,  40,  20],
    [ 1.00, 245,   0,   0],
];

// ── Purple-Orange Velocity Colormap ──
const PURPLE_ORANGE_VEL_STOPS = [
    [-1.00,  80,   0, 160],
    [-0.75, 100,  40, 180],
    [-0.50, 120,  80, 200],
    [-0.30, 150, 120, 210],
    [-0.15, 180, 170, 220],
    [-0.03, 200, 200, 200],
    [ 0.03, 200, 200, 200],
    [ 0.15, 220, 180, 140],
    [ 0.30, 230, 160, 100],
    [ 0.50, 240, 130,  50],
    [ 0.75, 240, 100,  20],
    [ 1.00, 245,  80,   0],
];

// ── Correlation Coefficient Colormap ──
const CC_COLORS = [
    [0.20,   0,   0,   0, 150],
    [0.40, 100, 100, 100, 180],
    [0.60, 176, 196, 222, 200],
    [0.70,   0, 191, 255, 200],
    [0.80,   0, 128, 255, 200],
    [0.85,   0, 255,   0, 200],
    [0.90, 255, 255,   0, 200],
    [0.95, 255, 165,   0, 200],
    [0.97, 255,   0,   0, 200],
    [1.00, 255,   0, 255, 200],
    [1.05, 255, 255, 255, 200],
];

// ── Alternative continuous colormaps (for reflectivity) ──
// Each stop: [t (0..1), R, G, B]
const TURBO_STOPS = [
    [0.00,  48,  18,  59],
    [0.07,  69,  55, 171],
    [0.13,  66,  91, 213],
    [0.20,  33, 131, 226],
    [0.27,  11, 165, 220],
    [0.33,  18, 192, 187],
    [0.40,  47, 216, 144],
    [0.47,  96, 235, 100],
    [0.53, 156, 244,  59],
    [0.60, 206, 237,  36],
    [0.67, 240, 212,  29],
    [0.73, 253, 180,  25],
    [0.80, 247, 141,  21],
    [0.87, 229,  97,  14],
    [0.93, 200,  53,   8],
    [1.00, 122,   4,   3],
];

const VIRIDIS_STOPS = [
    [0.00,  68,   1,  84],
    [0.07,  72,  23, 105],
    [0.13,  71,  44, 122],
    [0.20,  65,  63, 131],
    [0.27,  57,  82, 139],
    [0.33,  47, 100, 142],
    [0.40,  38, 117, 139],
    [0.47,  31, 133, 135],
    [0.53,  28, 149, 127],
    [0.60,  34, 165, 113],
    [0.67,  54, 179,  95],
    [0.73,  87, 192,  72],
    [0.80, 131, 202,  47],
    [0.87, 185, 212,  24],
    [0.93, 232, 222,  31],
    [1.00, 253, 231,  37],
];

const HOMEYER_STOPS = [
    [0.00,   4,   4,  60],
    [0.07,  24,  24, 155],
    [0.13,  47,  94, 206],
    [0.20,  30, 150, 230],
    [0.27,  25, 204, 198],
    [0.33,  25, 220, 100],
    [0.40,  80, 240,  50],
    [0.47, 180, 250,  30],
    [0.53, 245, 248,  60],
    [0.60, 252, 217,  35],
    [0.67, 250, 170,  20],
    [0.73, 245, 110,  15],
    [0.80, 230,  40,  10],
    [0.87, 190,  10,  50],
    [0.93, 170,  15, 140],
    [1.00, 240, 200, 255],
];

// ── Spectral CC Colormap ──
const SPECTRAL_CC_COLORS = [
    [0.20,  60,   0, 120, 150],
    [0.40,   0,   0, 200, 180],
    [0.60,   0, 150, 255, 200],
    [0.70,   0, 220, 150, 200],
    [0.80,   0, 255,   0, 200],
    [0.85, 200, 255,   0, 200],
    [0.90, 255, 255,   0, 200],
    [0.95, 255, 165,   0, 200],
    [0.97, 255,  50,   0, 200],
    [1.00, 255,   0,   0, 200],
    [1.05, 255, 255, 255, 200],
];

// ── Named colormap lookup tables for built-in maps ──
const BUILTIN_VELOCITY_CMAPS = {
    "nwsvel": NWS_VEL_STOPS,
    "bluered": BLUE_RED_VEL_STOPS,
    "purpleorange": PURPLE_ORANGE_VEL_STOPS,
};

const BUILTIN_CC_CMAPS = {
    "nwscc": CC_COLORS,
    "spectral": SPECTRAL_CC_COLORS,
};

// ── Custom colormap registry ──
// Maps colormap name -> { type: "stepped"|"interpolated"|"velocity", stops: [...], alpha?: number }
const customColormapRegistry = {};

function registerCustomColormap(name, data) {
    customColormapRegistry[name] = data;
}

function unregisterCustomColormap(name) {
    delete customColormapRegistry[name];
}

function getRegisteredColormap(name) {
    return customColormapRegistry[name] || null;
}

/**
 * Build a 256-entry RGBA color lookup table for uint8 quantized values.
 * Entry 255 is always transparent (no-data sentinel).
 */
function buildRadarColorLUT(product, vmin, vmax, cmap) {
    const lut = new Uint8ClampedArray(256 * 4);
    const cmapKey = (cmap || "").toLowerCase();

    // Check custom registry first (works for any product)
    const custom = getRegisteredColormap(cmap) || getRegisteredColormap(cmapKey);
    if (custom) {
        if (custom.type === "velocity") {
            _buildVelocityLUT(lut, vmin, vmax, custom.stops);
        } else if (custom.type === "interpolated") {
            _buildInterpolatedLUT(lut, custom.stops, custom.alpha || 200);
        } else {
            _buildSteppedLUT(lut, custom.stops, vmin, vmax);
        }
        lut[255 * 4 + 3] = 0;
        return lut;
    }

    if (product === "srv" || product === "velocity") {
        const velStops = BUILTIN_VELOCITY_CMAPS[cmapKey] || NWS_VEL_STOPS;
        _buildVelocityLUT(lut, vmin, vmax, velStops);
    } else if (product === "cc") {
        const ccStops = BUILTIN_CC_CMAPS[cmapKey] || CC_COLORS;
        _buildSteppedLUT(lut, ccStops, vmin, vmax);
    } else if (product === "reflectivity") {
        if (cmapKey === "turbo") {
            _buildInterpolatedLUT(lut, TURBO_STOPS, 200);
        } else if (cmapKey === "viridis") {
            _buildInterpolatedLUT(lut, VIRIDIS_STOPS, 200);
        } else if (cmapKey === "homeyerrainbow") {
            _buildInterpolatedLUT(lut, HOMEYER_STOPS, 200);
        } else {
            _buildSteppedLUT(lut, NWS_REF_COLORS, vmin, vmax);
        }
    } else {
        // fallback: grayscale
        for (let i = 0; i < 255; i++) {
            const v = Math.round((i / 254) * 255);
            lut[i * 4] = v;
            lut[i * 4 + 1] = v;
            lut[i * 4 + 2] = v;
            lut[i * 4 + 3] = 200;
        }
    }
    // 255 = no data → transparent
    lut[255 * 4 + 3] = 0;
    return lut;
}

function _buildSteppedLUT(lut, stops, vmin, vmax) {
    for (let i = 0; i < 255; i++) {
        const physVal = vmin + (i / 254) * (vmax - vmin);
        let matched = false;
        for (let s = stops.length - 1; s >= 0; s--) {
            if (physVal >= stops[s][0]) {
                lut[i * 4]     = stops[s][1];
                lut[i * 4 + 1] = stops[s][2];
                lut[i * 4 + 2] = stops[s][3];
                lut[i * 4 + 3] = stops[s][4];
                matched = true;
                break;
            }
        }
        if (!matched) {
            lut[i * 4 + 3] = 0;
        }
    }
}

function _buildInterpolatedLUT(lut, stops, alpha) {
    for (let i = 0; i < 255; i++) {
        const t = i / 254;
        let lo = 0, hi = stops.length - 1;
        for (let s = 0; s < stops.length - 1; s++) {
            if (t >= stops[s][0] && t <= stops[s + 1][0]) {
                lo = s;
                hi = s + 1;
                break;
            }
        }
        const range = stops[hi][0] - stops[lo][0];
        const frac = range > 0 ? (t - stops[lo][0]) / range : 0;
        lut[i * 4]     = Math.round(stops[lo][1] + (stops[hi][1] - stops[lo][1]) * frac);
        lut[i * 4 + 1] = Math.round(stops[lo][2] + (stops[hi][2] - stops[lo][2]) * frac);
        lut[i * 4 + 2] = Math.round(stops[lo][3] + (stops[hi][3] - stops[lo][3]) * frac);
        lut[i * 4 + 3] = alpha;
    }
    lut[255 * 4 + 3] = 0;
}

function _buildVelocityLUT(lut, vmin, vmax, stops) {
    if (!stops) stops = NWS_VEL_STOPS;
    for (let i = 0; i < 255; i++) {
        const normalized = (i / 254) * 2 - 1; // -1 to 1

        // Find enclosing stops
        let lo = 0, hi = stops.length - 1;
        for (let s = 0; s < stops.length - 1; s++) {
            if (normalized >= stops[s][0] && normalized <= stops[s + 1][0]) {
                lo = s;
                hi = s + 1;
                break;
            }
        }

        const range = stops[hi][0] - stops[lo][0];
        const t = range > 0 ? (normalized - stops[lo][0]) / range : 0;

        lut[i * 4]     = Math.round(stops[lo][1] + (stops[hi][1] - stops[lo][1]) * t);
        lut[i * 4 + 1] = Math.round(stops[lo][2] + (stops[hi][2] - stops[lo][2]) * t);
        lut[i * 4 + 2] = Math.round(stops[lo][3] + (stops[hi][3] - stops[lo][3]) * t);
        lut[i * 4 + 3] = 170;
    }
    lut[255 * 4 + 3] = 0;
}

/**
 * Decode a base64 string to Uint8Array.
 */
function decodeBase64ToUint8Array(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Leaflet GridLayer that renders individual radar gates on canvas tiles.
 *
 * sweepData is the JSON returned by /api/radar/sweep:
 *   { site, key, product, latitude, longitude, azimuths[], firstGateRange,
 *     gateWidth, numGates, numRadials, maxRange, vmin, vmax, noDataValue, data }
 *
 * Usage:
 *   const layer = radarCanvasLayer(sweepData, { opacity: 0.7 });
 *   layer.addTo(map);
 */
const RadarCanvasLayer = L.GridLayer.extend({
    initialize: function (sweepData, options) {
        this._sweepData = sweepData;
        this._gateData = decodeBase64ToUint8Array(sweepData.data);
        const cmap = (options && options.cmap) || "NWSRef";
        this._colorLUT = buildRadarColorLUT(
            sweepData.product,
            sweepData.vmin,
            sweepData.vmax,
            cmap
        );

        this._radarLat = sweepData.latitude;
        this._radarLon = sweepData.longitude;
        this._radarLatRad = sweepData.latitude * (Math.PI / 180);
        this._cosRadarLat = Math.cos(this._radarLatRad);

        this._numRadials = sweepData.numRadials || sweepData.azimuths.length;
        this._numGates = sweepData.numGates;
        this._firstGateRange = sweepData.firstGateRange;
        this._gateWidth = sweepData.gateWidth;
        this._maxRange = sweepData.maxRange ||
            sweepData.firstGateRange + sweepData.numGates * sweepData.gateWidth;
        this._noData = sweepData.noDataValue || 255;

        // Simple azimuth step for nearest-neighbor lookup
        this._azStep = 360 / this._numRadials;
        this._azOffset = sweepData.azimuths[0] || 0;

        // Compute coverage bounds for Leaflet
        const maxRangeKm = this._maxRange / 1000;
        const latDelta = maxRangeKm / 111.32;
        const lonDelta = maxRangeKm / (111.32 * Math.max(0.2, Math.abs(this._cosRadarLat)));

        const coverageBounds = L.latLngBounds(
            [this._radarLat - latDelta, this._radarLon - lonDelta],
            [this._radarLat + latDelta, this._radarLon + lonDelta]
        );

        options = L.Util.extend({
            bounds: coverageBounds,
            minZoom: 3,
            maxZoom: 15,
            tileSize: 256,
            updateWhenZooming: false,
            updateWhenIdle: true,
            zIndex: 500,
            id: "radar-layer",
        }, options || {});

        L.GridLayer.prototype.initialize.call(this, options);
    },

    createTile: function (coords) {
        const tile = document.createElement("canvas");
        tile.width = tile.height = 256;
        const ctx = tile.getContext("2d");
        this._renderTile(ctx, coords);
        return tile;
    },

    _renderTile: function (ctx, coords) {
        const TILE = 256;
        const map = this._map;

        // Tile pixel bounds → lat/lon
        const nwPoint = L.point(coords.x * TILE, coords.y * TILE);
        const sePoint = L.point((coords.x + 1) * TILE, (coords.y + 1) * TILE);
        const nw = map.unproject(nwPoint, coords.z);
        const se = map.unproject(sePoint, coords.z);

        const north = nw.lat;
        const south = se.lat;
        const west = nw.lng;
        const east = se.lng;

        // Quick rejection: tile corners vs radar max range
        const maxRangeM = this._maxRange;
        const metersPerDegLat = 111320;
        const metersPerDegLon = 111320 * this._cosRadarLat;

        // Nearest point on tile rect to radar center
        const nearLat = Math.max(south, Math.min(north, this._radarLat));
        const nearLon = Math.max(west, Math.min(east, this._radarLon));
        const ndx = (nearLon - this._radarLon) * metersPerDegLon;
        const ndy = (nearLat - this._radarLat) * metersPerDegLat;
        if (ndx * ndx + ndy * ndy > maxRangeM * maxRangeM) {
            return; // tile entirely outside radar range
        }

        const imageData = ctx.createImageData(TILE, TILE);
        const pixels = imageData.data;

        const latStep = (north - south) / TILE;
        const lonStep = (east - west) / TILE;

        const radarLat = this._radarLat;
        const radarLon = this._radarLon;
        const cosLat = this._cosRadarLat;
        const firstRange = this._firstGateRange;
        const gateWidth = this._gateWidth;
        const numGates = this._numGates;
        const numRadials = this._numRadials;
        const gateData = this._gateData;
        const colorLUT = this._colorLUT;
        const noData = this._noData;
        const maxRangeSq = maxRangeM * maxRangeM;
        const firstRangeSq = firstRange * firstRange;
        const azStep = this._azStep;
        const azOffset = this._azOffset;
        const invGateWidth = 1 / gateWidth;
        const invAzStep = 1 / azStep;
        const RAD_TO_DEG = 180 / Math.PI;

        for (let py = 0; py < TILE; py++) {
            const lat = north - (py + 0.5) * latStep;
            const dy = (lat - radarLat) * metersPerDegLat;

            for (let px = 0; px < TILE; px++) {
                const lon = west + (px + 0.5) * lonStep;
                const dx = (lon - radarLon) * metersPerDegLon;

                const rangeSq = dx * dx + dy * dy;
                if (rangeSq > maxRangeSq || rangeSq < firstRangeSq) continue;

                const range = Math.sqrt(rangeSq);
                if (range >= maxRangeM) continue;

                // Fractional gate index for bilinear interpolation
                const gateF = (range - firstRange) * invGateWidth;
                const g0 = gateF | 0; // floor
                if (g0 >= numGates) continue;
                const g1 = g0 + 1 < numGates ? g0 + 1 : g0;
                const gT = gateF - g0; // fractional part

                // Azimuth from north, clockwise
                let azimuth = Math.atan2(dx, dy) * RAD_TO_DEG;
                if (azimuth < 0) azimuth += 360;

                // Fractional azimuth index for bilinear interpolation
                const azF = ((azimuth - azOffset + 360) % 360) * invAzStep;
                let a0 = Math.floor(azF) % numRadials;
                if (a0 < 0) a0 += numRadials;
                const a1 = (a0 + 1) % numRadials;
                const aT = azF - Math.floor(azF); // fractional part

                // Sample 4 corners: (a0,g0) (a1,g0) (a0,g1) (a1,g1)
                const v00 = gateData[a0 * numGates + g0];
                const v10 = gateData[a1 * numGates + g0];
                const v01 = gateData[a0 * numGates + g1];
                const v11 = gateData[a1 * numGates + g1];

                // Bilinear blend — if all 4 corners have data, interpolate
                // otherwise fall back to nearest neighbor
                let r, g, b, a;
                const allValid = v00 !== noData && v10 !== noData && v01 !== noData && v11 !== noData;

                if (allValid) {
                    // Interpolate in color space for smooth result
                    const i00 = v00 << 2, i10 = v10 << 2, i01 = v01 << 2, i11 = v11 << 2;
                    const w00 = (1 - aT) * (1 - gT);
                    const w10 = aT * (1 - gT);
                    const w01 = (1 - aT) * gT;
                    const w11 = aT * gT;
                    r = colorLUT[i00] * w00 + colorLUT[i10] * w10 + colorLUT[i01] * w01 + colorLUT[i11] * w11;
                    g = colorLUT[i00+1] * w00 + colorLUT[i10+1] * w10 + colorLUT[i01+1] * w01 + colorLUT[i11+1] * w11;
                    b = colorLUT[i00+2] * w00 + colorLUT[i10+2] * w10 + colorLUT[i01+2] * w01 + colorLUT[i11+2] * w11;
                    a = colorLUT[i00+3] * w00 + colorLUT[i10+3] * w10 + colorLUT[i01+3] * w01 + colorLUT[i11+3] * w11;
                } else {
                    // Nearest neighbor fallback at data edges
                    const nearest = (aT < 0.5 ? (gT < 0.5 ? v00 : v01) : (gT < 0.5 ? v10 : v11));
                    if (nearest === noData) continue;
                    const ni = nearest << 2;
                    r = colorLUT[ni]; g = colorLUT[ni+1]; b = colorLUT[ni+2]; a = colorLUT[ni+3];
                }

                if (a < 1) continue;

                const pixIdx = (py * TILE + px) << 2;
                pixels[pixIdx]     = r;
                pixels[pixIdx + 1] = g;
                pixels[pixIdx + 2] = b;
                pixels[pixIdx + 3] = a;
            }
        }

        ctx.putImageData(imageData, 0, 0);
    },
});

/**
 * Factory function for creating a RadarCanvasLayer.
 */
function radarCanvasLayer(sweepData, options) {
    return new RadarCanvasLayer(sweepData, options);
}
