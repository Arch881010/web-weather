// Radar.js — reworked to fetch directly from Unidata S3/NOMADS via NexradClient
// (nexrad-browser.js) instead of a local backend server.
//
// RadarRender.js is unchanged — it still receives the same sweep envelope.
//
// The only removed concept is `config.radarApi.base` (no server URL needed).
// Everything else — site selection, product switching, colormaps, caching,
// the WMS fallback, hover tooltips, colorbar — is identical to before.
//
// Requires: nexrad-browser.js loaded before this file (provides NexradClient).

// ── NexradClient singleton ────────────────────────────────────────────────────
// Shared across all calls; maintains its own in-memory TTL cache.
const _nexradClient = new NexradClient({ cacheTtlSeconds: 30 });

let radarLayer = null;
let radarSelectedSite = null;
let radarLastKey = null;
let radarLastSite = null;
let radarLastProduct = null;
let radarLastCmap = null;
let radarNeedsInitialForce = true;
let radarActiveMode = null;
let radarFetchController = null; // AbortController for in-flight fetch
let radarInFlightParams = null;  // { site, product } of the current in-flight fetch
const RADAR_SWEEP_CACHE = new Map();
const RADAR_SWEEP_CACHE_TTL_MS = 0.5 * 60 * 1000; // 30 s
const RADAR_SITE_FAILURE_THRESHOLD = 3;
const radarSiteFailureCounts = {};
const radarSiteFailureNotified = new Set();
let radarHoverHandler = null;
let radarHoverEnabled = false;

// ── Per-product colormap defaults and built-in options ────────────────────────

const DEFAULT_COLORMAPS = {
    reflectivity: "NWSRef",
    velocity: "NWSVel",
    srv: "NWSVel",
    cc: "NWSCC",
    classification: "N/A",
};

const BUILTIN_COLORMAP_OPTIONS = {
    reflectivity: [
        { value: "NWSRef",         label: "NWSRef" },
        { value: "HomeyerRainbow", label: "HomeyerRainbow" },
        { value: "turbo",          label: "Turbo" },
        { value: "viridis",        label: "Viridis" },
    ],
    velocity: [
        { value: "NWSVel",         label: "NWSVel (Green-Red)" },
        { value: "BlueRed",        label: "Blue-Red" },
        { value: "PurpleOrange",   label: "Purple-Orange" },
    ],
    srv: [
        { value: "NWSVel",         label: "NWSVel (Green-Red)" },
        { value: "BlueRed",        label: "Blue-Red" },
        { value: "PurpleOrange",   label: "Purple-Orange" },
    ],
    cc: [
        { value: "NWSCC",     label: "NWSCC (Default)" },
        { value: "Spectral",  label: "Spectral" },
    ],
    classification: [
        { value: "N/A", label: "N/A (Default)" },
    ],
};

let customColormaps = {};

function loadCustomColormaps() {
    try {
        const stored = localStorage.getItem("radarCustomColormaps");
        if (stored) {
            customColormaps = JSON.parse(stored);
            for (const product of Object.keys(customColormaps)) {
                for (const name of Object.keys(customColormaps[product])) {
                    registerCustomColormap(name, customColormaps[product][name]);
                }
            }
        }
    } catch (e) {
        console.warn("Failed to load custom colormaps:", e);
    }
}

function saveCustomColormaps() {
    try {
        localStorage.setItem("radarCustomColormaps", JSON.stringify(customColormaps));
    } catch (e) {
        console.error("Failed to save custom colormaps:", e);
    }
}

// ── Level / product helpers ───────────────────────────────────────────────────
// NOTE: "level" in the old code referred to the backend API parameter (2 or 3).
// With NexradClient the level is handled internally — NZB/N0B/N0H are fetched
// automatically based on product.  We keep getRadarLevel() so existing UI code
// (level badge, product lists) continues to work without modification.

function getRadarLevel() {
    return config.radarApi?.level || 2;
}

function getColormapForProduct(product) {
    const normalized = normalizeRadarProduct(product);
    if (config.radarApi?.colormaps && config.radarApi.colormaps[normalized]) {
        return config.radarApi.colormaps[normalized];
    }
    return DEFAULT_COLORMAPS[normalized] || "NWSRef";
}

function setColormapForProduct(product, colormap) {
    const normalized = normalizeRadarProduct(product);
    if (!config.radarApi) config.radarApi = {};
    if (!config.radarApi.colormaps) config.radarApi.colormaps = {};
    config.radarApi.colormaps[normalized] = colormap;
    config.radarApi.cmap = colormap;
    localStorage.setItem("weatherAppSettings", JSON.stringify(config));
}

function getAvailableColormaps(product) {
    const normalized = normalizeRadarProduct(product);
    const builtins = BUILTIN_COLORMAP_OPTIONS[normalized] || BUILTIN_COLORMAP_OPTIONS.reflectivity;
    const result = [...builtins];
    if (customColormaps[normalized]) {
        for (const name of Object.keys(customColormaps[normalized])) {
            result.push({ value: name, label: name + " (Custom)" });
        }
    }
    return result;
}

function updateColormapDropdown(product) {
    const select = document.getElementById("radar-cmap");
    if (!select) return;
    const normalized = normalizeRadarProduct(product || config.radarApi?.product || "reflectivity");
    const options = getAvailableColormaps(normalized);
    const current = getColormapForProduct(normalized);
    select.innerHTML = "";
    options.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        if (opt.value === current) option.selected = true;
        select.appendChild(option);
    });
    if (!select.value) select.selectedIndex = 0;
}

async function importColormapFromFile(product, file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const isPal = /\.pal$/i.test(file.name);
                let name, cmapData;

                if (isPal) {
                    const lines = text.split(/\r?\n/).map(ln => ln.trim()).filter(ln => ln && !ln.startsWith("#"));
                    let scale = null, palProduct = null;
                    for (const ln of lines) {
                        const scaleMatch = ln.match(/^Scale:\s*([\d.]+)/i);
                        if (scaleMatch) scale = parseFloat(scaleMatch[1]);
                        const prodMatch = ln.match(/^Product:\s*(\S+)/i);
                        if (prodMatch) palProduct = prodMatch[1].toUpperCase();
                    }
                    const isVelocityPal = scale != null || (palProduct && /^(BV|SRV|SRM|VEL|V)$/i.test(palProduct));
                    const colorEntries = [];
                    for (const ln of lines) {
                        const rfMatch = ln.match(/^RF:\s*(\d+)\s+(\d+)\s+(\d+)/i);
                        if (rfMatch) continue;
                        const match = ln.match(/^Color:\s*(.+)$/i);
                        if (!match) continue;
                        const nums = match[1].trim().split(/\s+/).map(Number);
                        if (nums.length >= 4 && nums.every(Number.isFinite)) {
                            colorEntries.push({ dbz: nums[0], r: nums[1], g: nums[2], b: nums[3] });
                        } else if (nums.length === 3 && nums.every(Number.isFinite)) {
                            colorEntries.push({ dbz: null, r: nums[0], g: nums[1], b: nums[2] });
                        }
                    }
                    if (!colorEntries.length) throw new Error("Invalid .pal file: no Color lines found");
                    const hasDbz = colorEntries.every(e => e.dbz !== null);
                    let stops, cmapType;
                    if (isVelocityPal && hasDbz) {
                        const absMax = Math.max(...colorEntries.map(e => Math.abs(e.dbz)));
                        const normMax = absMax || 150;
                        colorEntries.sort((a, b) => a.dbz - b.dbz);
                        stops = colorEntries.map(e => [e.dbz / normMax, e.r, e.g, e.b]);
                        cmapType = "velocity";
                    } else if (hasDbz) {
                        stops = colorEntries.map(e => [e.dbz, e.r, e.g, e.b, 200]);
                        cmapType = "stepped";
                    } else {
                        stops = colorEntries.map((e, idx) => {
                            const t = colorEntries.length === 1 ? 1 : idx / (colorEntries.length - 1);
                            return [t, e.r, e.g, e.b, 200];
                        });
                        cmapType = "interpolated";
                    }
                    if (cmapType !== "velocity") {
                        stops.forEach(s => { if (s[1] === 0 && s[2] === 0 && s[3] === 0) s[4] = 0; });
                    }
                    name = file.name.replace(/\.pal$/i, "");
                    cmapData = { type: cmapType, stops };
                } else {
                    const data = JSON.parse(text);
                    name = data.name || file.name.replace(/\.json$/i, "");
                    const type = data.type || "stepped";
                    const stops = data.stops || data.colormap || data;
                    if (!Array.isArray(stops) || stops.length === 0)
                        throw new Error("Invalid colormap: 'stops' must be a non-empty array");
                    cmapData = { type, stops };
                    if (data.alpha != null) cmapData.alpha = data.alpha;
                }

                const normalized = normalizeRadarProduct(product);
                if (!customColormaps[normalized]) customColormaps[normalized] = {};
                customColormaps[normalized][name] = cmapData;
                registerCustomColormap(name, cmapData);
                saveCustomColormaps();
                resolve(name);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
    });
}

function exportColormap(product, colormapName) {
    const normalized = normalizeRadarProduct(product);
    let cmapData;
    if (customColormaps[normalized] && customColormaps[normalized][colormapName]) {
        cmapData = customColormaps[normalized][colormapName];
    } else {
        cmapData = getBuiltinColormapData(normalized, colormapName);
        if (!cmapData) return;
    }
    const productCodes   = { reflectivity: "BR", velocity: "BV", srv: "SRV", cc: "CC", classification: "HCA" };
    const unitNames      = { reflectivity: "dBZ", velocity: "KT", srv: "KT", cc: "CC", classification: "Code" };
    const lines = [
        `Product: ${productCodes[normalized] || "BR"}`,
        `Units: ${unitNames[normalized] || "dBZ"}`,
    ];
    if (cmapData.type === "velocity") {
        const absMax = Math.max(...cmapData.stops.map(s => Math.abs(s[0])));
        const normMax = absMax || 1;
        const sorted = [...cmapData.stops].sort((a, b) => a[0] - b[0]);
        if (sorted.length >= 2) lines.push(`Step: ${Math.abs(Math.round((sorted[1][0] - sorted[0][0]) / normMax * 150)) || 1}`);
        for (const s of sorted) lines.push(`Color: ${Math.round((s[0] / normMax) * 150)} ${s[1]} ${s[2]} ${s[3]}`);
    } else if (cmapData.type === "interpolated") {
        const defaultRanges = { reflectivity: [-20, 80], velocity: [-60, 60], srv: [-60, 60], cc: [0, 1.05] };
        const colorbarRange = (typeof getColorbarRange === "function") ? getColorbarRange() : {};
        const range = defaultRanges[normalized] || [-20, 80];
        const vmin = colorbarRange.vmin != null ? colorbarRange.vmin : range[0];
        const vmax = colorbarRange.vmax != null ? colorbarRange.vmax : range[1];
        const sorted = [...cmapData.stops].sort((a, b) => a[0] - b[0]);
        const mappedStops = sorted.map(s => [Math.round((vmin + s[0] * (vmax - vmin)) * 100) / 100, s[1], s[2], s[3]]);
        if (mappedStops.length >= 2) lines.push(`Step: ${Math.round((mappedStops[1][0] - mappedStops[0][0]) * 100) / 100}`);
        for (const s of mappedStops) lines.push(`Color: ${s[0]} ${s[1]} ${s[2]} ${s[3]}`);
    } else {
        const sorted = [...cmapData.stops].sort((a, b) => a[0] - b[0]);
        if (sorted.length >= 2) lines.push(`Step: ${sorted[1][0] - sorted[0][0]}`);
        for (const s of sorted) lines.push(`Color: ${s[0]} ${s[1]} ${s[2]} ${s[3]}`);
    }
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${colormapName}.pal`; a.click();
    URL.revokeObjectURL(url);
}

function deleteCustomColormap(product, colormapName) {
    const normalized = normalizeRadarProduct(product);
    if (customColormaps[normalized] && customColormaps[normalized][colormapName]) {
        delete customColormaps[normalized][colormapName];
        unregisterCustomColormap(colormapName);
        saveCustomColormaps();
        return true;
    }
    return false;
}

function renameCustomColormap(product, oldName, newName) {
    const normalized = normalizeRadarProduct(product);
    if (!customColormaps[normalized] || !customColormaps[normalized][oldName]) return false;
    if (oldName === newName) return true;
    const cmapData = customColormaps[normalized][oldName];
    delete customColormaps[normalized][oldName];
    unregisterCustomColormap(oldName);
    customColormaps[normalized][newName] = cmapData;
    registerCustomColormap(newName, cmapData);
    saveCustomColormaps();
    return true;
}

function isCustomColormap(product, colormapName) {
    const normalized = normalizeRadarProduct(product);
    return !!(customColormaps[normalized] && customColormaps[normalized][colormapName]);
}

function _createRenameDialog() {
    let overlay = document.getElementById("rename-dialog-overlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "rename-dialog-overlay";
    overlay.innerHTML = `
        <div id="rename-dialog">
            <div id="rename-dialog-title">Rename Colormap</div>
            <label class="rename-dialog-label">New Name</label>
            <input type="text" id="rename-dialog-input" maxlength="60" placeholder="Enter new name" />
            <div id="rename-dialog-buttons">
                <button id="rename-dialog-cancel">Cancel</button>
                <button id="rename-dialog-ok">Rename</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    return overlay;
}

function showRenameDialog(currentName) {
    return new Promise((resolve) => {
        const overlay = _createRenameDialog();
        const input = document.getElementById("rename-dialog-input");
        const okBtn = document.getElementById("rename-dialog-ok");
        const cancelBtn = document.getElementById("rename-dialog-cancel");
        input.value = currentName || "";
        function cleanup() {
            overlay.style.display = "none";
            okBtn.removeEventListener("click", onOk);
            cancelBtn.removeEventListener("click", onCancel);
            overlay.removeEventListener("click", onOverlayClick);
            document.removeEventListener("keydown", onKey);
        }
        function onOk() { const val = input.value.trim(); cleanup(); resolve(val || null); }
        function onCancel() { cleanup(); resolve(null); }
        function onOverlayClick(e) { if (e.target === overlay) { cleanup(); resolve(null); } }
        function onKey(e) {
            if (e.key === "Escape") { cleanup(); resolve(null); }
            if (e.key === "Enter") onOk();
        }
        okBtn.addEventListener("click", onOk);
        cancelBtn.addEventListener("click", onCancel);
        overlay.addEventListener("click", onOverlayClick);
        document.addEventListener("keydown", onKey);
        overlay.style.display = "flex";
        input.focus(); input.select();
    });
}

function _createConfirmDialog() {
    let overlay = document.getElementById("confirm-dialog-overlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "confirm-dialog-overlay";
    overlay.innerHTML = `
        <div id="confirm-dialog">
            <div id="confirm-dialog-title">Confirm</div>
            <div id="confirm-dialog-message"></div>
            <div id="confirm-dialog-buttons">
                <button id="confirm-dialog-cancel">Cancel</button>
                <button id="confirm-dialog-ok">Delete</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    return overlay;
}

function showConfirmDialog(message, title = "Confirm") {
    return new Promise((resolve) => {
        const overlay = _createConfirmDialog();
        document.getElementById("confirm-dialog-title").textContent = title;
        document.getElementById("confirm-dialog-message").textContent = message;
        const okBtn = document.getElementById("confirm-dialog-ok");
        const cancelBtn = document.getElementById("confirm-dialog-cancel");
        function cleanup() {
            overlay.style.display = "none";
            okBtn.removeEventListener("click", onOk);
            cancelBtn.removeEventListener("click", onCancel);
            overlay.removeEventListener("click", onOverlayClick);
            document.removeEventListener("keydown", onKey);
        }
        function onOk() { cleanup(); resolve(true); }
        function onCancel() { cleanup(); resolve(false); }
        function onOverlayClick(e) { if (e.target === overlay) { cleanup(); resolve(false); } }
        function onKey(e) {
            if (e.key === "Escape") { cleanup(); resolve(false); }
            if (e.key === "Enter") { cleanup(); resolve(true); }
        }
        okBtn.addEventListener("click", onOk);
        cancelBtn.addEventListener("click", onCancel);
        overlay.addEventListener("click", onOverlayClick);
        document.addEventListener("keydown", onKey);
        overlay.style.display = "flex";
        cancelBtn.focus();
    });
}

function setRadarSiteStatus(message) {
    const el = document.getElementById("radar-site-status");
    if (el) el.textContent = message || "";
}

function setBottomRadarStatus(message, isHTML = false) {
    const el = document.getElementById("radar-runtime-status");
    if (!el) return;
    if (isHTML) el.innerHTML = message || "";
    else el.textContent = message || "";
}

function _formatScanTime(sweepData) {
    if (sweepData && sweepData.scanTime) {
        try { return new Date(sweepData.scanTime).toLocaleTimeString(); } catch (_) {}
    }
    return new Date().toLocaleTimeString();
}

const AVAILABLE_PRODUCTS = [
    { value: "reflectivity",   label: "Reflectivity" },
    { value: "velocity",       label: "Velocity" },
    { value: "srv",            label: "SRV" },
    { value: "classification", label: "Classification" },
];

// Keep getProductsForLevel for backwards-compat with UI that calls it
function getProductsForLevel(level) {
    // All products are available — NexradClient routes Level II/III internally
    return AVAILABLE_PRODUCTS;
}

function syncProductDropdownsToLevel() {
    const products = AVAILABLE_PRODUCTS;
    const currentProduct = normalizeRadarProduct(config.radarApi?.product || "reflectivity");

    const settingsSelect = document.getElementById("radar-site-product");
    if (settingsSelect) {
        settingsSelect.innerHTML = "";
        products.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.value;
            opt.textContent = p.label;
            if (p.value === currentProduct) opt.selected = true;
            settingsSelect.appendChild(opt);
        });
    }

    const statusSelect = document.getElementById("status-product-switch");
    if (statusSelect) {
        statusSelect.innerHTML = "";
        products.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.value;
            opt.textContent = p.label;
            if (p.value === currentProduct) opt.selected = true;
            statusSelect.appendChild(opt);
        });
    }
}

function _buildRadarStatusHTML(scanTimeStr, product, site) {
    // Level badge retained for UI consistency (always shows "SR" since NexradClient
    // uses super-resolution where available)
    const levelLabel = "SR";
    const levelTitle = "Super-Resolution";
    const levelTag = `<span class="status-level-badge" title="${levelTitle}">${levelLabel}</span>`;
    const options = AVAILABLE_PRODUCTS.map((p) => {
        const sel = p.value === product ? " selected" : "";
        return `<option value="${p.value}"${sel}>${p.label}</option>`;
    }).join("");
    return (
        `Radar: ${scanTimeStr} | ` +
        `<select id="status-product-switch" title="Switch radar product">${options}</select>` +
        ` ${levelTag} | ${site}`
    );
}

function _bindStatusProductSwitch() {
    const sel = document.getElementById("status-product-switch");
    if (!sel) return;
    sel.addEventListener("change", (e) => {
        const newProduct = e.target.value;
        if (!config.radarApi) config.radarApi = {};
        config.radarApi.product = newProduct;
        localStorage.setItem("weatherAppSettings", JSON.stringify(config));
        const settingsSelect = document.getElementById("radar-site-product");
        if (settingsSelect) settingsSelect.value = newProduct;
        updateRadarLayer();
    });
}

function normalizeRadarProduct(product) {
    const value = (product || "").trim().toLowerCase();
    const aliases = {
        "": "reflectivity", "ref": "reflectivity", "reflectivity": "reflectivity",
        "n0q": "reflectivity", "n0r": "reflectivity",
        "srv": "srv", "srm": "srv",
        "velocity": "velocity", "vel": "velocity", "v": "velocity",
        "cc": "cc",
        "classification": "classification", "class": "classification",
        "hydrometeor": "classification",
        "reflectivity_l3": "reflectivity",
    };
    return aliases[value] || "reflectivity";
}

function radarProductLabel(product) {
    const labels = {
        reflectivity: "Reflectivity", velocity: "Velocity",
        srv: "SRV", cc: "CC", classification: "Hydrometeor Classification",
    };
    return labels[normalizeRadarProduct(product)] || "Reflectivity";
}

function handleRepeatedRadarSiteFailure(site, error) {
    const message = `Radar site ${site} failed repeatedly. Switched to WMS.`;
    console.error(message, error);
    if (!radarSiteFailureNotified.has(site)) {
        radarSiteFailureNotified.add(site);
        try { window.alert(message); } catch (_) {}
    }
    if (!config.radarApi) config.radarApi = {};
    config.radarApi.mode = "wms";
    const radarModeInput = document.getElementById("radar-mode");
    if (radarModeInput) radarModeInput.value = "wms";
    localStorage.setItem("weatherAppSettings", JSON.stringify(config));
    updateRadarLayer();
    setRadarSiteStatus(message);
    setBottomRadarStatus(`Radar Status: ${message}`);
}

function getRadarApiConfig() {
    return config.radarApi;
}

function clearRadarLayerById() {
    try {
        map.eachLayer((layer) => {
            if (layer.options && layer.options.id === "radar-layer") map.removeLayer(layer);
        });
        _unbindRadarHover();
    } catch (e) {
        console.warn(e);
    }
}

function updateSelectedRadarLabel(site) {
    const labels = document.querySelectorAll(".radar");
    labels.forEach(label => label.classList.remove("selected-radar"));
    const selected = Array.from(labels).find(
        label => (label.textContent || "").trim().toUpperCase() === site.toUpperCase()
    );
    if (selected) selected.classList.add("selected-radar");
}

async function fetchSweepData(site, force = false, signal = null) {
    const product = normalizeRadarProduct(config.radarApi?.product || "reflectivity");
    const cacheKey = `${site.toUpperCase()}:${product}`;

    // Browser-side sweep cache (separate from NexradClient's internal cache)
    if (!force) {
        const cached = RADAR_SWEEP_CACHE.get(cacheKey);
        if (cached && (Date.now() - cached.ts) < RADAR_SWEEP_CACHE_TTL_MS) {
            console.log(`[radar] Using cached sweep for ${cacheKey}`);
            return cached.data;
        }
    }

    const data = await _nexradClient.getSweep(site, product, { force });

    if (signal && signal.aborted) {
        throw Object.assign(new Error("AbortError"), { name: "AbortError" });
    }

    // Store in cache
    RADAR_SWEEP_CACHE.set(cacheKey, { data, ts: Date.now() });
    // Evict stale entries
    for (const [k, v] of RADAR_SWEEP_CACHE) {
        if (Date.now() - v.ts > RADAR_SWEEP_CACHE_TTL_MS) RADAR_SWEEP_CACHE.delete(k);
    }

    return data;
}


function setRadarLayerFromSweep(sweepData, opacity) {
    if (radarLayer) { map.removeLayer(radarLayer); radarLayer = null; }
    const product = normalizeRadarProduct(sweepData.product || config.radarApi?.product || "reflectivity");
    const cmap = getColormapForProduct(product);
    radarLayer = radarCanvasLayer(sweepData, { opacity, cmap }).addTo(map);
    _bindRadarHover();
    updateRadarColorbar(product, sweepData.vmin, sweepData.vmax, cmap);
    return true;
}

function setRadarSitePreference(site, persist = false) {
    const normalizedSite = (site || "").trim().toUpperCase();
    if (!normalizedSite) return;
    if (!config.radarApi) config.radarApi = {};
    config.radarApi.site = normalizedSite;
    config.radarApi.mode = "site";
    const radarModeInput = document.getElementById("radar-mode");
    if (radarModeInput) radarModeInput.value = "site";
    const radarSiteInput = document.getElementById("radar-site");
    if (radarSiteInput) radarSiteInput.value = normalizedSite;
    if (persist) localStorage.setItem("weatherAppSettings", JSON.stringify(config));
}

async function loadRadarForSite(radarSiteCode, coordinates = null, force = false) {
    try {
        const site = radarSiteCode.toUpperCase();
        radarSelectedSite = site;
        const requestedProduct = normalizeRadarProduct(config.radarApi?.product || "reflectivity");

        // Skip duplicate in-flight request
        if (
            !force &&
            radarFetchController &&
            radarInFlightParams &&
            radarInFlightParams.site === site &&
            radarInFlightParams.product === requestedProduct
        ) {
            console.log(`[radar] Skipping duplicate fetch for ${site}:${requestedProduct} (already in-flight)`);
            return false;
        }

        // Cancel any existing in-flight fetch
        if (radarFetchController) {
            radarFetchController.abort();
            radarFetchController = null;
            radarInFlightParams = null;
        }
        radarFetchController = new AbortController();
        radarInFlightParams = { site, product: requestedProduct };
        const signal = radarFetchController.signal;

        setBottomRadarStatus(`Radar Status: Fetching ${radarProductLabel(requestedProduct)} for ${site}...`);

        const sweepData = await fetchSweepData(site, force, signal);
        radarFetchController = null;
        radarInFlightParams = null;

        const key            = sweepData.key || "";
        const resolvedSite   = (sweepData.site || site).toUpperCase();
        const resolvedProduct= normalizeRadarProduct(sweepData.product || requestedProduct);
        const currentCmap    = getColormapForProduct(resolvedProduct);

        // Skip re-render if nothing has changed
        if (
            !force &&
            radarLayer &&
            key &&
            radarLastKey === key &&
            radarLastSite === resolvedSite &&
            radarLastProduct === resolvedProduct &&
            radarLastCmap === currentCmap
        ) {
            radarLayer.setOpacity(config.opacity.radar);
            updateSelectedRadarLabel(resolvedSite);
            setRadarSitePreference(resolvedSite, true);
            setBottomRadarStatus(
                _buildRadarStatusHTML(_formatScanTime(sweepData), resolvedProduct, resolvedSite),
                true
            );
            _bindStatusProductSwitch();
            return true;
        }

        radarLastKey     = key;
        radarLastSite    = resolvedSite;
        radarLastProduct = resolvedProduct;
        radarLastCmap    = currentCmap;
        radarSiteFailureCounts[resolvedSite] = 0;

        updateSelectedRadarLabel(resolvedSite);
        setRadarLayerFromSweep(sweepData, config.opacity.radar);
        setRadarSitePreference(resolvedSite, true);
        setBottomRadarStatus(
            _buildRadarStatusHTML(_formatScanTime(sweepData), resolvedProduct, resolvedSite),
            true
        );
        _bindStatusProductSwitch();
        return true;

    } catch (error) {
        if (error.name === "AbortError") {
            console.log("[radar] Radar fetch aborted (superseded by new request)");
            return false;
        }

        const site = (radarSiteCode || "").trim().toUpperCase();
        if (site) {
            const currentFailures = (radarSiteFailureCounts[site] || 0) + 1;
            radarSiteFailureCounts[site] = currentFailures;
            if (currentFailures >= RADAR_SITE_FAILURE_THRESHOLD) {
                handleRepeatedRadarSiteFailure(site, error);
                return false;
            }
        }

        console.error("Error loading radar:", error);
        setBottomRadarStatus(`Radar Status: Error loading ${site || "radar"} — ${error.message || error}`);
        return false;
    }
}

function removeRadar() {
    if (radarLayer) { map.removeLayer(radarLayer); radarLayer = null; }
    _unbindRadarHover();
    document.querySelectorAll(".radar.selected-radar").forEach(label => label.classList.remove("selected-radar"));
    radarSelectedSite = null;
    radarLastKey      = null;
    radarLastSite     = null;
    radarLastProduct  = null;
    radarLastCmap     = null;
    radarNeedsInitialForce = true;
    radarActiveMode   = null;
    if (radarFetchController) {
        radarFetchController.abort();
        radarFetchController = null;
        radarInFlightParams  = null;
    }
    setRadarSiteStatus("");
    setBottomRadarStatus("");
    hideRadarColorbar();
    console.log("Radar layer removed");
}


function _ensureRadarHoverTooltip() {
    let el = document.getElementById("radar-hover-tooltip");
    if (!el) {
        el = document.createElement("div");
        el.id = "radar-hover-tooltip";
        Object.assign(el.style, {
            position: "fixed", pointerEvents: "none",
            background: "rgba(0,0,0,0.75)", color: "#fff",
            padding: "4px 6px", borderRadius: "4px", fontSize: "12px",
            zIndex: 10000, transform: "translate(10px, -10px)", display: "none",
        });
        document.body.appendChild(el);
    }
    return el;
}

function _bindRadarHover() {
    if (!radarHoverEnabled || !radarLayer || radarHoverHandler) return;
    const tooltip = _ensureRadarHoverTooltip();
    radarHoverHandler = (e) => {
        if (!radarLayer || !radarLayer.getValueAtLatLng) return;
        const sample = radarLayer.getValueAtLatLng(e.latlng);
        if (!sample) { tooltip.style.display = "none"; return; }
        let text = "";
        if (sample.product === "classification") {
            text = `${sample.label} (code ${sample.code})`;
        } else if (sample.units === "m/s") {
            text = `${sample.value.toFixed(1)} m/s (${(sample.value * 2.23694).toFixed(1)} mph)`;
        } else if (sample.units) {
            text = `${sample.value.toFixed(1)} ${sample.units}`;
        } else {
            text = sample.value.toFixed(1);
        }
        tooltip.textContent = text;
        tooltip.style.left = `${e.originalEvent.clientX + 8}px`;
        tooltip.style.top  = `${e.originalEvent.clientY - 8}px`;
        tooltip.style.display = "block";
    };
    map.on("mousemove", radarHoverHandler);
    map.on("mouseout", _hideRadarHoverTooltip);
}

function _hideRadarHoverTooltip() {
    const el = document.getElementById("radar-hover-tooltip");
    if (el) el.style.display = "none";
}

function _unbindRadarHover() {
    if (radarHoverHandler) {
        map.off("mousemove", radarHoverHandler);
        map.off("mouseout", _hideRadarHoverTooltip);
        radarHoverHandler = null;
    }
    _hideRadarHoverTooltip();
}

function updateRadarLayer(isAutomaticTick = false) {
    if (userSettings.opacity.radar === 0) {
        clearRadarLayerById();
        removeRadar();
        return;
    }

    const radarMode = config.radarApi?.mode || "wms";

    if (radarMode === "site") {
        const radarSite    = (config.radarApi?.site || "").trim().toUpperCase();
        const radarProduct = normalizeRadarProduct(config.radarApi?.product || "reflectivity");

        if (!radarSite) {
            console.warn("Radar site mode enabled but no site is set.");
            clearRadarLayerById();
            removeRadar();
            return;
        }

        if (radarActiveMode !== "site") clearRadarLayerById();

        const forceNewest = radarNeedsInitialForce;
        setRadarSiteStatus(forceNewest ? `Using saved site: ${radarSite}` : `Current site: ${radarSite}`);
        setBottomRadarStatus(`Radar Status: Fetching ${radarProductLabel(radarProduct)} for ${radarSite}...`);

        radarNeedsInitialForce = false;
        radarActiveMode = "site";
        loadRadarForSite(radarSite, null, forceNewest);
        return;
    }

    removeRadar();

    let radarTileMap = userSettings.radarTilemap;
    if (radarTileMap === undefined) radarTileMap = "n0q";

    let radarLayerFound = false;
    let currentType = "undefined";
    if (map.eachLayer) {
        map.eachLayer((layer) => {
            if (layer.options && layer.options.id === "radar-layer") {
                layer.setOpacity(config.opacity.radar);
                radarLayerFound = true;
                currentType = layer.options.layers;
            }
        });
    }
    if (radarLayerFound && currentType === `nexrad-${radarTileMap}-900913`) {
        console.info("Radar layer opacity updated.");
        return;
    } else if (radarLayerFound) {
        console.warn("Radar layer type changed, removing old layer.");
        clearRadarLayerById();
        _unbindRadarHover();
    }

    L.tileLayer.wms(
        `https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/${radarTileMap}.cgi`,
        {
            layers: `nexrad-${radarTileMap}-900913`,
            format: "image/png",
            transparent: true,
            attribution: "Weather data © 2024 IEM Nexrad",
            id: "radar-layer",
            opacity: config.opacity.radar,
        }
    ).addTo(map);

    radarActiveMode = "wms";
    setBottomRadarStatus(`Radar Status: Source IEM [${radarTileMap.toUpperCase()}]`);
    console.info("Radar layer updated.");
}

loadCustomColormaps();