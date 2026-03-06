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

// [normalized (-1..1), R, G, B]
// AtticRadar VEL1 color table: -73 to 73 m/s
//   inbound (negative): light pink → hot pink → purple → blue → cyan → green → dark green
//   zero: gray
//   outbound (positive): dark red → red → pink → yellow → orange → brown → black
const NWS_VEL_STOPS = [
    [-1.000, 255, 204, 230],   //   0.00%  light pink (max inbound)
    [-0.857, 252,   0, 130],   //   7.14%  hot pink
    [-0.714, 109,   2, 150],   //  14.29%  purple (end)
    [-0.644,  22,  13, 156],   //  17.86%  dark blue (end of segment)
    [-0.643,  24,  39, 165],   //  17.86%  blue (start of segment)
    [-0.572,  30, 111, 188],   //  21.43%  medium blue (end)
    [-0.571,  40, 204, 220],   //  25.00%  cyan (end)
    [-0.500,  47, 222, 226],   //  25.00%  cyan (start)
    [-0.358, 181, 237, 239],   //  32.14%  light cyan (end)
    [-0.357, 181, 237, 239],   //  32.14%  light cyan (start)
    [-0.287,   2, 241,   3],   //  35.71%  bright green (end)
    [-0.286,   3, 234,   2],   //  35.71%  bright green (start)
    [-0.072,   0, 100,   0],   //  46.43%  dark green (end)
    [-0.071,  78, 121,  76],   //  46.43%  olive gray (start)
    [-0.001, 116, 131, 112],   //  50.00%  gray-green (zero left)
    [ 0.001, 137, 117, 122],   //  50.00%  gray-red (zero right)
    [ 0.070, 130,  51,  59],   //  53.57%  red-brown (end)
    [ 0.071, 109,   0,   0],   //  53.57%  dark red (start)
    [ 0.285, 242,   0,   7],   //  64.29%  red (end)
    [ 0.286, 249,  51,  76],   //  64.29%  red-pink (start)
    [ 0.393, 255, 149, 207],   //  69.64%  pink (end)
    [ 0.394, 253, 160, 201],   //  69.64%  pink (start)
    [ 0.428, 255, 232, 172],   //  71.43%  light yellow (end)
    [ 0.429, 253, 228, 160],   //  71.43%  light yellow (start)
    [ 0.571, 253, 149,  83],   //  78.57%  orange (end)
    [ 0.572, 254, 142,  80],   //  78.57%  orange (start)
    [ 0.857, 110,  14,   9],   //  92.86%  dark brown
    [ 1.000,   0,   0,   0],   // 100.00%  black (max outbound)
];

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

// Codes: 0=No data, 10=Biological, 20=Ground clutter/AP, 30=Ice crystals,
// 40=Dry snow, 50=Wet snow, 60=Rain, 70=Heavy rain, 80=Big drops,
// 90=Graupel, 100=Hail, 140=Unknown, 150=Range folded
const HYDRO_CLASS = [
    { code: 0,   label: "No data",              short: "No data",   rgba: [  0,   0,   0,   0] },
    { code: 10,  label: "Biological",           short: "Biological",rgba: [170, 200, 120, 200] },
    { code: 20,  label: "Ground clutter/AP",    short: "Clutter",   rgba: [120, 120, 120, 200] },
    { code: 30,  label: "Ice crystals",         short: "Ice",       rgba: [180, 220, 255, 200] },
    { code: 40,  label: "Dry snow",             short: "Dry snow",  rgba: [120, 200, 255, 200] },
    { code: 50,  label: "Wet snow",             short: "Wet snow",  rgba: [ 70, 130, 180, 200] },
    { code: 60,  label: "Rain",                 short: "Rain",      rgba: [  0, 200,   0, 200] },
    { code: 70,  label: "Heavy rain",           short: "Heavy rain",rgba: [255, 255,   0, 200] },
    { code: 80,  label: "Big drops",            short: "Big drops", rgba: [255, 165,   0, 200] },
    { code: 90,  label: "Graupel",              short: "Graupel",   rgba: [255, 105, 180, 200] },
    { code: 100, label: "Hail",                 short: "Hail",      rgba: [220,   0,   0, 220] },
    { code: 140, label: "Unknown",              short: "Unknown",   rgba: [200, 200, 200, 200] },
    { code: 150, label: "Range folded",         short: "Range fold",rgba: [160,  32, 240, 200] },
];

const BUILTIN_VELOCITY_CMAPS = {
    "nwsvel": NWS_VEL_STOPS,
    "bluered": BLUE_RED_VEL_STOPS,
    "purpleorange": PURPLE_ORANGE_VEL_STOPS,
};

const BUILTIN_CC_CMAPS = {
    "nwscc": CC_COLORS,
    "spectral": SPECTRAL_CC_COLORS,
};

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

function getBuiltinColormapData(product, colormapName) {
    const key = (colormapName || "").toLowerCase();
    const norm = (product || "").toLowerCase();

    if (norm === "velocity" || norm === "srv") {
        const stops = BUILTIN_VELOCITY_CMAPS[key];
        if (stops) return { type: "velocity", stops };
    }
    if (norm === "cc") {
        const stops = BUILTIN_CC_CMAPS[key];
        if (stops) return { type: "stepped", stops };
    }
    if (norm === "reflectivity") {
        if (key === "nwsref")          return { type: "stepped",      stops: NWS_REF_COLORS };
        if (key === "turbo")           return { type: "interpolated", stops: TURBO_STOPS };
        if (key === "viridis")         return { type: "interpolated", stops: VIRIDIS_STOPS };
        if (key === "homeyerrainbow")  return { type: "interpolated", stops: HOMEYER_STOPS };
    }
    return null;
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
    } else if (product === "classification") {
        _buildClassificationLUT(lut, vmin, vmax);
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

function _nearestHydroClass(value) {
    let best = HYDRO_CLASS[0];
    let bestDist = Infinity;
    for (const cls of HYDRO_CLASS) {
        const dist = Math.abs(value - cls.code);
        if (dist < bestDist) {
            bestDist = dist;
            best = cls;
        }
    }
    return best;
}

function _buildClassificationLUT(lut, vmin, vmax) {
    for (let i = 0; i < 255; i++) {
        const value = vmin + (i / 254) * (vmax - vmin);
        const cls = _nearestHydroClass(value);
        const [r, g, b, a] = cls.rgba;
        lut[i * 4] = r;
        lut[i * 4 + 1] = g;
        lut[i * 4 + 2] = b;
        lut[i * 4 + 3] = a;
    }
    // No-data sentinel transparent
    lut[255 * 4 + 3] = 0;
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
            maxZoom: 18,
            tileSize: 256,
            updateWhenZooming: true,
            updateWhenIdle: false,
            zIndex: 500,
            id: "radar-layer",
        }, options || {});

        L.GridLayer.prototype.initialize.call(this, options);
    },

    /**
     * Sample the underlying gate value at a given LatLng. Returns null when
     * outside coverage or when the gate is no-data.
     */
    getValueAtLatLng: function (latlng) {
        if (!latlng) return null;

        const metersPerDegLat = 111320;
        const metersPerDegLon = 111320 * this._cosRadarLat;

        const dx = (latlng.lng - this._radarLon) * metersPerDegLon;
        const dy = (latlng.lat - this._radarLat) * metersPerDegLat;
        const rangeSq = dx * dx + dy * dy;
        const maxRangeSq = this._maxRange * this._maxRange;
        if (rangeSq <= 0 || rangeSq > maxRangeSq) return null;

        const range = Math.sqrt(rangeSq);
        const gateIdx = Math.floor((range - this._firstGateRange) / this._gateWidth);
        if (gateIdx < 0 || gateIdx >= this._numGates) return null;

        let az = (Math.atan2(dx, dy) * (180 / Math.PI));
        if (az < 0) az += 360;
        let radial = Math.round((az - this._azOffset) / this._azStep);
        radial = ((radial % this._numRadials) + this._numRadials) % this._numRadials;

        const idx = radial * this._numGates + gateIdx;
        const val = this._gateData[idx];
        if (val === this._noData || val === 255) return null;

        const physical = this._sweepData.vmin + (val / 254) * (this._sweepData.vmax - this._sweepData.vmin);

        if (this._sweepData.product === "classification") {
            const cls = _nearestHydroClass(physical);
            return { product: "classification", code: cls.code, label: cls.label, rgba: cls.rgba };
        }

        const baseProd = this._sweepData.product;
        let units = "";
        if (baseProd === "reflectivity") units = "dBZ";
        else if (baseProd === "velocity" || baseProd === "srv") units = "m/s";
        else if (baseProd === "cc") units = "ρHV";

        return { product: this._sweepData.product, value: physical, units };
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

        // Use nearest-neighbor for classification (categorical data),
        // bilinear interpolation for all other products
        const useInterp = false;

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

                // Azimuth from north, clockwise
                let azimuth = Math.atan2(dx, dy) * RAD_TO_DEG;
                if (azimuth < 0) azimuth += 360;

                // Fractional gate and azimuth indices
                const gateF = (range - firstRange) * invGateWidth;
                const azF = ((azimuth - azOffset + 360) % 360) * invAzStep;

                let val;

                if (useInterp) {
                    // ── Bilinear interpolation for smooth rendering ──
                    const g0 = Math.floor(gateF);
                    if (g0 < 0 || g0 >= numGates) continue;
                    const g1 = Math.min(g0 + 1, numGates - 1);
                    const gf = gateF - g0;

                    const a0 = ((Math.floor(azF) % numRadials) + numRadials) % numRadials;
                    const a1 = (a0 + 1) % numRadials;
                    const af = azF - Math.floor(azF);

                    const v00 = gateData[a0 * numGates + g0];
                    const v01 = gateData[a0 * numGates + g1];
                    const v10 = gateData[a1 * numGates + g0];
                    const v11 = gateData[a1 * numGates + g1];

                    // Skip if all samples are no-data
                    if (v00 === noData && v01 === noData && v10 === noData && v11 === noData) continue;

                    // Weighted interpolation, skipping no-data samples
                    const w00 = (1 - gf) * (1 - af);
                    const w01 = gf * (1 - af);
                    const w10 = (1 - gf) * af;
                    const w11 = gf * af;

                    let sum = 0, wt = 0;
                    if (v00 !== noData) { sum += v00 * w00; wt += w00; }
                    if (v01 !== noData) { sum += v01 * w01; wt += w01; }
                    if (v10 !== noData) { sum += v10 * w10; wt += w10; }
                    if (v11 !== noData) { sum += v11 * w11; wt += w11; }

                    if (wt < 0.01) continue;
                    val = Math.round(sum / wt);
                } else {
                    // ── Nearest-neighbor for classification (categorical) ──
                    const gateIdx = gateF | 0;
                    if (gateIdx >= numGates) continue;
                    let azIdx = Math.round(azF) % numRadials;
                    if (azIdx < 0) azIdx += numRadials;
                    val = gateData[azIdx * numGates + gateIdx];
                    if (val === noData) continue;
                }

                const ci = val << 2;
                const r = colorLUT[ci];
                const g = colorLUT[ci + 1];
                const b = colorLUT[ci + 2];
                const a = colorLUT[ci + 3];

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

// ── Radar Colorbar Legend ──
let _colorbarProduct = null;
let _colorbarVmin = null;
let _colorbarVmax = null;

/**
 * Generate nice round tick values for a given range.
 */
function _generateNiceTicks(vmin, vmax, maxTicks) {
    const range = vmax - vmin;
    if (range <= 0) return [vmin];
    const rough = range / maxTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step;
    if (norm < 1.5) step = 1 * mag;
    else if (norm < 3) step = 2 * mag;
    else if (norm < 7) step = 5 * mag;
    else step = 10 * mag;

    const ticks = [];
    let start = Math.ceil(vmin / step) * step;
    // Snap to avoid floating point drift
    start = Math.round(start / step) * step;
    for (let v = start; v <= vmax + step * 0.001; v += step) {
        ticks.push(Math.round(v / step) * step);
    }
    return ticks;
}

/**
 * Draw / update the colorbar legend at the bottom of the screen.
 * Call after rendering a new sweep or changing colormaps.
 */
function updateRadarColorbar(product, vmin, vmax, cmap) {
    const bar = document.getElementById("radar-colorbar");
    if (!bar) return;

    _colorbarProduct = product;
    _colorbarVmin = vmin;
    _colorbarVmax = vmax;

    if (product === "classification") {
        _drawClassificationColorbar(vmin, vmax);
        return;
    }

    const lut = buildRadarColorLUT(product, vmin, vmax, cmap);

    // Draw gradient on canvas
    const canvas = document.getElementById("colorbar-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    for (let x = 0; x < w; x++) {
        const i = Math.round((x / (w - 1)) * 254);
        const idx = i * 4;
        ctx.fillStyle = `rgba(${lut[idx]},${lut[idx + 1]},${lut[idx + 2]},${lut[idx + 3] / 255})`;
        ctx.fillRect(x, 0, 1, h);
    }

    // Tick labels
    const labels = document.getElementById("colorbar-labels");
    if (labels) {
        labels.innerHTML = "";
        const ticks = _generateNiceTicks(vmin, vmax, product === "cc" ? 5 : 6);
        ticks.forEach(val => {
            const frac = (val - vmin) / (vmax - vmin);
            if (frac < -0.01 || frac > 1.01) return;
            const span = document.createElement("span");
            span.style.left = (Math.min(1, Math.max(0, frac)) * 100) + "%";
            if (product === "cc") {
                span.textContent = val.toFixed(val >= 1 ? 1 : 2);
            } else {
                span.textContent = Math.round(val);
            }
            labels.appendChild(span);
        });
    }

    // Bind tooltip events (once)
    if (!canvas._colorbarBound) {
        canvas.addEventListener("mousemove", _colorbarMouseMove);
        canvas.addEventListener("mouseleave", _colorbarMouseLeave);
        canvas._colorbarBound = true;
    }

    bar.style.display = "";
}

function _drawClassificationColorbar(vmin, vmax) {
    const canvas = document.getElementById("colorbar-canvas");
    const labels = document.getElementById("colorbar-labels");
    const bar = document.getElementById("radar-colorbar");
    if (!canvas || !bar) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const visible = HYDRO_CLASS.filter((cls) => cls.rgba[3] !== 0);
    const segment = w / visible.length;

    visible.forEach((cls, idx) => {
        const [r, g, b, a] = cls.rgba;
        ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
        ctx.fillRect(idx * segment, 0, segment, h);
    });

    if (labels) {
        labels.innerHTML = "";
        visible.forEach((cls, idx) => {
            const span = document.createElement("span");
            span.style.left = ((idx + 0.5) / visible.length) * 100 + "%";
            span.textContent = cls.short || cls.label;
            labels.appendChild(span);
        });
    }

    // Bind tooltip events (once)
    if (!canvas._colorbarBound) {
        canvas.addEventListener("mousemove", _colorbarMouseMove);
        canvas.addEventListener("mouseleave", _colorbarMouseLeave);
        canvas._colorbarBound = true;
    }

    bar.style.display = "";
}

function _colorbarMouseMove(e) {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frac = Math.max(0, Math.min(1, x / rect.width));
    const val = _colorbarVmin + frac * (_colorbarVmax - _colorbarVmin);

    const tooltip = document.getElementById("colorbar-tooltip");
    if (!tooltip) return;

    const baseProd = _colorbarProduct;
    let text;
    if (baseProd === "velocity" || baseProd === "srv") {
        const mph = val * 2.23694;
        text = `${val.toFixed(1)} m/s (${mph.toFixed(1)} mph)`;
    } else if (baseProd === "cc") {
        text = `\u03C1HV: ${val.toFixed(3)}`;
    } else if (baseProd === "reflectivity") {
        text = `${val.toFixed(1)} dBZ`;
    } else if (baseProd === "classification") {
        const cls = _nearestHydroClass(val);
        text = `${cls.label} (${cls.code})`;
    } else {
        text = val.toFixed(1);
    }

    tooltip.textContent = text;
    tooltip.style.left = x + "px";
    tooltip.style.display = "block";
}

function _colorbarMouseLeave() {
    const tooltip = document.getElementById("colorbar-tooltip");
    if (tooltip) tooltip.style.display = "none";
}

function hideRadarColorbar() {
    const bar = document.getElementById("radar-colorbar");
    if (bar) bar.style.display = "none";
}
