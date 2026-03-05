let radarLayer = null;
let radarSelectedSite = null;
let radarLastKey = null;
let radarLastSite = null;
let radarLastProduct = null;
let radarLastCmap = null;
let radarNeedsInitialForce = true;
let radarActiveMode = null;
let radarFetchController = null; // AbortController for in-flight fetch
let radarInFlightParams = null; // { site, product, level } of the current in-flight fetch
const RADAR_SWEEP_CACHE = new Map(); // browser-side sweep data cache
const RADAR_SWEEP_CACHE_TTL_MS = 0.5 * 60 * 1000; // 30 s
const RADAR_SITE_FAILURE_THRESHOLD = 3;
const radarSiteFailureCounts = {};
const radarSiteFailureNotified = new Set();
let radarHoverHandler = null;
let radarHoverEnabled = false; // user preference, default off

// ── Per-product colormap defaults and built-in options ──
const DEFAULT_COLORMAPS = {
    reflectivity: "NWSRef",
    velocity: "NWSVel",
    srv: "NWSVel",
    cc: "NWSCC",
    classification: "N/A",
};

const BUILTIN_COLORMAP_OPTIONS = {
    reflectivity: [
        { value: "NWSRef", label: "NWSRef" },
        { value: "HomeyerRainbow", label: "HomeyerRainbow" },
        { value: "turbo", label: "Turbo" },
        { value: "viridis", label: "Viridis" },
    ],
    velocity: [
        { value: "NWSVel", label: "NWSVel (Green-Red)" },
        { value: "BlueRed", label: "Blue-Red" },
        { value: "PurpleOrange", label: "Purple-Orange" },
    ],
    srv: [
        { value: "NWSVel", label: "NWSVel (Green-Red)" },
        { value: "BlueRed", label: "Blue-Red" },
        { value: "PurpleOrange", label: "Purple-Orange" },
    ],
    cc: [
        { value: "NWSCC", label: "NWSCC (Default)" },
        { value: "Spectral", label: "Spectral" },
    ],
    classification: [
        { value: "N/A", label: "N/A (Default)" },
    ],
};

// ── Custom colormap storage ──
let customColormaps = {}; // { product: { name: { type, stops, alpha? } } }

function loadCustomColormaps() {
    try {
        const stored = localStorage.getItem("radarCustomColormaps");
        if (stored) {
            customColormaps = JSON.parse(stored);
            // Re-register all custom colormaps with the renderer
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

/** Get the configured data level (2 or 3) */
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
    // Also update the legacy cmap field for backwards compatibility
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

    // If saved value not in list, select first
    if (!select.value) {
        select.selectedIndex = 0;
    }
}

async function importColormapFromFile(product, file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const isPal = /\.pal$/i.test(file.name);

                let name;
                let cmapData;

                if (isPal) {
                    // NWS-style .pal: header lines then "Color: <value> R G B [R2 G2 B2]"
                    // Velocity .pal files have "Scale:" and/or "Product: BV" headers
                    // with thresholds in knots; we convert to normalized -1..1 stops.
                    const lines = text
                        .split(/\r?\n/)
                        .map((ln) => ln.trim())
                        .filter((ln) => ln && !ln.startsWith("#"));

                    // Parse header metadata
                    let scale = null;   // e.g. 1.942 for knots
                    let palProduct = null;
                    for (const ln of lines) {
                        const scaleMatch = ln.match(/^Scale:\s*([\d.]+)/i);
                        if (scaleMatch) scale = parseFloat(scaleMatch[1]);
                        const prodMatch = ln.match(/^Product:\s*(\S+)/i);
                        if (prodMatch) palProduct = prodMatch[1].toUpperCase();
                    }

                    const isVelocityPal = scale != null || (palProduct && /^(BV|SRV|SRM|VEL|V)$/i.test(palProduct));

                    const colorEntries = [];
                    let rfColor = null;
                    for (const ln of lines) {
                        // Range-folded color
                        const rfMatch = ln.match(/^RF:\s*(\d+)\s+(\d+)\s+(\d+)/i);
                        if (rfMatch) {
                            rfColor = [+rfMatch[1], +rfMatch[2], +rfMatch[3]];
                            continue;
                        }
                        const match = ln.match(/^Color:\s*(.+)$/i);
                        if (!match) continue;
                        const nums = match[1].trim().split(/\s+/).map(Number);
                        if (nums.length >= 4 && nums.every(Number.isFinite)) {
                            colorEntries.push({
                                dbz: nums[0],
                                r: nums[1],
                                g: nums[2],
                                b: nums[3],
                            });
                        } else if (nums.length === 3 && nums.every(Number.isFinite)) {
                            colorEntries.push({
                                dbz: null,
                                r: nums[0],
                                g: nums[1],
                                b: nums[2],
                            });
                        }
                    }

                    if (!colorEntries.length) {
                        throw new Error("Invalid .pal file: no Color lines found");
                    }

                    let stops;
                    let cmapType;
                    const hasDbz = colorEntries.every((e) => e.dbz !== null);

                    if (isVelocityPal && hasDbz) {
                        // Velocity .pal: thresholds are in display units (e.g. knots).
                        // Find the symmetric max value to normalize to -1..1.
                        const absMax = Math.max(
                            ...colorEntries.map((e) => Math.abs(e.dbz))
                        );
                        const normMax = absMax || 150;
                        // Sort from most-negative to most-positive
                        colorEntries.sort((a, b) => a.dbz - b.dbz);
                        stops = colorEntries.map((e) => [
                            e.dbz / normMax,  // normalized -1..1
                            e.r, e.g, e.b,
                        ]);
                        cmapType = "velocity";
                    } else if (hasDbz) {
                        // Reflectivity-style stepped colormap
                        stops = colorEntries.map((e) => [e.dbz, e.r, e.g, e.b, 200]);
                        cmapType = "stepped";
                    } else {
                        // No thresholds — interpolate evenly
                        stops = colorEntries.map((e, idx) => {
                            const t = colorEntries.length === 1 ? 1 : idx / (colorEntries.length - 1);
                            return [t, e.r, e.g, e.b, 200];
                        });
                        cmapType = "interpolated";
                    }

                    // Alpha 0 for fully-black entries (transparent background)
                    if (cmapType !== "velocity") {
                        stops.forEach((s) => {
                            if (s[1] === 0 && s[2] === 0 && s[3] === 0) s[4] = 0;
                        });
                    }

                    name = file.name.replace(/\.pal$/i, "");
                    cmapData = { type: cmapType, stops };
                } else {
                    const data = JSON.parse(text);
                    name = data.name || file.name.replace(/\.json$/i, "");
                    const type = data.type || "stepped";
                    const stops = data.stops || data.colormap || data;

                    if (!Array.isArray(stops) || stops.length === 0) {
                        throw new Error("Invalid colormap: 'stops' must be a non-empty array");
                    }

                    cmapData = { type: type, stops: stops };
                    if (data.alpha != null) cmapData.alpha = data.alpha;
                }

                const normalized = normalizeRadarProduct(product);
                if (!customColormaps[normalized]) customColormaps[normalized] = {};
                customColormaps[normalized][name] = cmapData;

                // Register with the renderer
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
        throw new Error("Only custom colormaps can be exported.");
    }

    // Build .pal file content
    const lines = [];
    lines.push(`# ${colormapName}`);
    lines.push(`# Product: ${normalized}`);
    lines.push(`# Exported: ${new Date().toISOString()}`);

    if (cmapData.type === "velocity") {
        lines.push("Product: BV");
        lines.push("Scale: 1.942");
        // Velocity stops are normalized -1..1; convert back to display units
        const absMax = Math.max(...cmapData.stops.map((s) => Math.abs(s[0])));
        const normMax = absMax || 1;
        for (const s of cmapData.stops) {
            const displayVal = Math.round((s[0] / normMax) * 150);
            lines.push(`Color: ${displayVal} ${s[1]} ${s[2]} ${s[3]}`);
        }
    } else {
        for (const s of cmapData.stops) {
            // s = [threshold, R, G, B, alpha?]
            lines.push(`Color: ${s[0]} ${s[1]} ${s[2]} ${s[3]}`);
        }
    }

    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${colormapName}.pal`;
    a.click();
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
    if (!customColormaps[normalized] || !customColormaps[normalized][oldName]) {
        return false;
    }
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

// ── Rename dialog UI ──
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

/**
 * Show a rename dialog. Returns a Promise that resolves with the new name string, or null if cancelled.
 */
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

        function onOk() {
            const val = input.value.trim();
            cleanup();
            resolve(val || null);
        }
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
        input.focus();
        input.select();
    });
}

// ── Confirm dialog UI ──
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

/**
 * Show a confirm dialog. Returns a Promise that resolves with true (confirmed) or false (cancelled).
 */
function showConfirmDialog(message, title = "Confirm") {
    return new Promise((resolve) => {
        const overlay = _createConfirmDialog();
        const titleEl = document.getElementById("confirm-dialog-title");
        const msgEl = document.getElementById("confirm-dialog-message");
        const okBtn = document.getElementById("confirm-dialog-ok");
        const cancelBtn = document.getElementById("confirm-dialog-cancel");

        titleEl.textContent = title;
        msgEl.textContent = message;

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
    const status = document.getElementById("radar-site-status");
    if (!status) return;
    status.textContent = message || "";
}

function setBottomRadarStatus(message, isHTML = false) {
    const status = document.getElementById("radar-runtime-status");
    if (!status) return;
    if (isHTML) {
        status.innerHTML = message || "";
    } else {
        status.textContent = message || "";
    }
}

/** Format the scan time from sweepData (ISO string) as a user-friendly local time */
function _formatScanTime(sweepData) {
    if (sweepData && sweepData.scanTime) {
        try {
            return new Date(sweepData.scanTime).toLocaleTimeString();
        } catch (_) { }
    }
    return new Date().toLocaleTimeString();
}

/** Per-level product lists */
const LEVEL2_PRODUCTS = [
    { value: "reflectivity", label: "Reflectivity" },
    { value: "velocity", label: "Velocity" },
];

const SUPERRES_PRODUCTS = [
    { value: "reflectivity", label: "Reflectivity" },
    { value: "velocity", label: "Velocity" },
    { value: "srv", label: "SRV" },
    { value: "classification", label: "Classification" },
];

/** Get the product list for the current data level */
function getProductsForLevel(level) {
    return level === 3 ? SUPERRES_PRODUCTS : LEVEL2_PRODUCTS;
}

/** Update all product dropdowns (settings + status bar) for the current level.
 *  If the current product is not in the new level's list, reset to reflectivity. */
function syncProductDropdownsToLevel() {
    const level = getRadarLevel();
    const products = getProductsForLevel(level);
    const currentProduct = normalizeRadarProduct(config.radarApi?.product || "reflectivity");

    // If current product not available at new level, fallback
    const validValues = new Set(products.map(p => p.value));
    if (!validValues.has(currentProduct)) {
        config.radarApi.product = "reflectivity";
        localStorage.setItem("weatherAppSettings", JSON.stringify(config));
    }

    // Update settings panel dropdown
    const settingsSelect = document.getElementById("radar-site-product");
    if (settingsSelect) {
        const selected = config.radarApi?.product || "reflectivity";
        settingsSelect.innerHTML = "";
        products.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.value;
            opt.textContent = p.label;
            if (p.value === selected) opt.selected = true;
            settingsSelect.appendChild(opt);
        });
    }

    // Update status-bar dropdown if present
    const statusSelect = document.getElementById("status-product-switch");
    if (statusSelect) {
        const selected = config.radarApi?.product || "reflectivity";
        statusSelect.innerHTML = "";
        products.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.value;
            opt.textContent = p.label;
            if (p.value === selected) opt.selected = true;
            statusSelect.appendChild(opt);
        });
    }
}

/** Build the rich radar status HTML with a product dropdown */
function _buildRadarStatusHTML(scanTimeStr, product, site) {
    const level = getRadarLevel();
    const levelLabel = level === 3 ? "SR" : "BR";
    const levelTitle = level === 3 ? "Super-Resolution" : "Basic-Resolution";
    const levelTag = `<span class="status-level-badge" title="${levelTitle}">${levelLabel}</span>`;
    const products = getProductsForLevel(level);
    const options = products.map((p) => {
        const sel = p.value === product ? " selected" : "";
        return `<option value="${p.value}"${sel}>${p.label}</option>`;
    }).join("");
    return (
        `Radar: ${scanTimeStr} | ` +
        `<select id="status-product-switch" title="Switch radar product">${options}</select>` +
        ` ${levelTag} | ${site}`
    );
}

/** Attach the change listener to the status-bar product dropdown */
function _bindStatusProductSwitch() {
    const sel = document.getElementById("status-product-switch");
    if (!sel) return;
    sel.addEventListener("change", (e) => {
        const newProduct = e.target.value;
        if (!config.radarApi) config.radarApi = {};
        config.radarApi.product = newProduct;
        localStorage.setItem("weatherAppSettings", JSON.stringify(config));
        // Also sync the settings-panel product select
        const settingsSelect = document.getElementById("radar-site-product");
        if (settingsSelect) settingsSelect.value = newProduct;
        // Trigger a radar reload
        updateRadarLayer();
    });
}

function normalizeRadarProduct(product) {
    const value = (product || "").trim().toLowerCase();
    const aliases = {
        "": "reflectivity",
        "ref": "reflectivity",
        "reflectivity": "reflectivity",
        "n0q": "reflectivity",
        "n0r": "reflectivity",
        "srv": "srv",
        "srm": "srv",
        "velocity": "velocity",
        "vel": "velocity",
        "v": "velocity",
        "cc": "cc",
        "classification": "classification",
        "class": "classification",
        "reflectivity_l3": "reflectivity",
    };
    return aliases[value] || "reflectivity";
}

function radarProductLabel(product) {
    const normalized = normalizeRadarProduct(product);
    const labels = {
        reflectivity: "Reflectivity",
        velocity: "Velocity",
        srv: "SRV",
        cc: "CC",
        classification: "Hydrometer Classification",
    };
    return labels[normalized] || "Reflectivity";
}

function handleRepeatedRadarSiteFailure(site, error) {
    const message = `Radar site ${site} failed repeatedly. Switched to WMS.`;
    console.error(message, error);

    if (!radarSiteFailureNotified.has(site)) {
        radarSiteFailureNotified.add(site);
        try {
            window.alert(message);
        } catch (_) { }
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
            if (layer.options && layer.options.id === "radar-layer") {
                map.removeLayer(layer);
            }
        });
        _unbindRadarHover();
    } catch (e) {
        console.warn(e);
    }
}



function updateSelectedRadarLabel(site) {
    const labels = document.querySelectorAll(".radar");
    labels.forEach((label) => label.classList.remove("selected-radar"));

    const selected = Array.from(labels).find(
        (label) => (label.textContent || "").trim().toUpperCase() === site.toUpperCase()
    );
    if (selected) {
        selected.classList.add("selected-radar");
    }
}

async function fetchSweepInfo(site, signal = null) {
    const radarApi = getRadarApiConfig();
    const base = radarApi.base;
    const product = normalizeRadarProduct(radarApi.product || "reflectivity");
    const level = getRadarLevel();

    const url = new URL(`${base}/api/radar/sweep/info`);
    url.searchParams.set("site", site.toUpperCase());
    if (product) url.searchParams.set("product", product);
    if (level) url.searchParams.set("level", String(level));

    const fetchOpts = signal ? { signal } : {};
    const response = await fetch(url.toString(), fetchOpts);
    if (!response.ok) return null;
    return await response.json();
}

async function fetchSweepData(site, force = false, signal = null) {
    const radarApi = getRadarApiConfig();
    const base = radarApi.base;
    const product = normalizeRadarProduct(radarApi.product || "reflectivity");
    const level = getRadarLevel();
    const cacheKey = `${site.toUpperCase()}:${product}:L${level}`;

    // Check browser-side cache (skip if force refresh)
    if (!force) {
        const cached = RADAR_SWEEP_CACHE.get(cacheKey);
        if (cached && (Date.now() - cached.ts) < RADAR_SWEEP_CACHE_TTL_MS) {
            console.log(`[radar] Using cached sweep for ${cacheKey} (age ${((Date.now() - cached.ts) / 1000).toFixed(0)}s)`);
            return cached.data;
        }
    }

    const url = new URL(`${base}/api/radar/sweep`);
    url.searchParams.set("site", site.toUpperCase());
    if (product) url.searchParams.set("product", product);
    if (level) url.searchParams.set("level", String(level));
    if (force) url.searchParams.set("force", "1");
    const fetchOpts = signal ? { signal } : {};
    const response = await fetch(url.toString(), fetchOpts);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Radar sweep failed (${response.status}): ${text}`);
    }
    const data = await response.json();

    // Store in browser cache
    RADAR_SWEEP_CACHE.set(cacheKey, { data, ts: Date.now() });

    // Evict stale entries
    for (const [k, v] of RADAR_SWEEP_CACHE) {
        if (Date.now() - v.ts > RADAR_SWEEP_CACHE_TTL_MS) {
            RADAR_SWEEP_CACHE.delete(k);
        }
    }

    return data;
}

function setRadarLayerFromSweep(sweepData, opacity) {
    if (radarLayer) {
        map.removeLayer(radarLayer);
        radarLayer = null;
    }

    const product = normalizeRadarProduct(sweepData.product || config.radarApi?.product || "reflectivity");
    const cmap = getColormapForProduct(product);
    radarLayer = radarCanvasLayer(sweepData, {
        opacity: opacity,
        cmap: cmap,
    }).addTo(map);

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

    if (persist) {
        localStorage.setItem("weatherAppSettings", JSON.stringify(config));
    }
}

let radarSweepSupported = null; // null = unknown, true/false after first check

async function loadRadarForSite(radarSiteCode, coordinates = null, force = false) {
    try {
        const site = radarSiteCode.toUpperCase();
        radarSelectedSite = site;
        const requestedProduct = normalizeRadarProduct(config.radarApi?.product || "reflectivity");
        const level = getRadarLevel();

        // If there's already an in-flight fetch for the same site/product/level
        // and this isn't a forced refresh, skip the redundant request.
        if (
            !force &&
            radarFetchController &&
            radarInFlightParams &&
            radarInFlightParams.site === site &&
            radarInFlightParams.product === requestedProduct &&
            radarInFlightParams.level === level
        ) {
            console.log(`[radar] Skipping duplicate fetch for ${site}:${requestedProduct}:L${level} (already in-flight)`);
            return false;
        }

        // Cancel any in-flight fetch before starting a new one
        if (radarFetchController) {
            radarFetchController.abort();
            radarFetchController = null;
            radarInFlightParams = null;
        }
        radarFetchController = new AbortController();
        radarInFlightParams = { site, product: requestedProduct, level };
        const signal = radarFetchController.signal;

        // Lightweight info check: skip full fetch if scan hasn't changed
        if (!force && radarLastKey && radarLastSite === site && radarLastProduct === requestedProduct) {
            try {
                const info = await fetchSweepInfo(site, signal);
                if (info && info.key && info.key === radarLastKey) {
                    console.log(`[radar] Scan unchanged for ${site} (key: ${info.key})`);
                    radarFetchController = null;
                    radarInFlightParams = null;
                    if (radarLayer) radarLayer.setOpacity(config.opacity.radar);
                    const scanTimeStr = info.scanTime
                        ? new Date(info.scanTime).toLocaleTimeString()
                        : new Date().toLocaleTimeString();
                    setBottomRadarStatus(
                        _buildRadarStatusHTML(scanTimeStr, requestedProduct, site),
                        true
                    );
                    _bindStatusProductSwitch();
                    return true;
                }
            } catch (e) {
                if (e.name === "AbortError") throw e;
                console.warn("[radar] Info check failed, proceeding with full fetch:", e.message);
            }
        }

        setBottomRadarStatus(`Radar Status: Fetching ${radarProductLabel(requestedProduct)} for ${site}...`);

        // Client-side canvas rendering from sweep data (Attic Radar style)
        const sweepData = await fetchSweepData(site, force, signal);
        radarFetchController = null;
        radarInFlightParams = null;
        radarSweepSupported = true;

        const key = sweepData.key || "";
        const resolvedSite = (sweepData.site || site).toUpperCase();
        const resolvedProduct = normalizeRadarProduct(sweepData.product || requestedProduct);

        const currentCmap = getColormapForProduct(resolvedProduct);

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

        radarLastKey = key;
        radarLastSite = resolvedSite;
        radarLastProduct = resolvedProduct;
        radarLastCmap = currentCmap;
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
        // If aborted (e.g. user switched site or a forced refresh was requested), silently ignore
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
    if (radarLayer) {
        map.removeLayer(radarLayer);
        radarLayer = null;
    }
    _unbindRadarHover();
    document.querySelectorAll(".radar.selected-radar").forEach((label) => {
        label.classList.remove("selected-radar");
    });
    radarSelectedSite = null;
    radarLastKey = null;
    radarLastSite = null;
    radarLastProduct = null;
    radarLastCmap = null;
    radarNeedsInitialForce = true;
    radarActiveMode = null;
    if (radarFetchController) {
        radarFetchController.abort();
        radarFetchController = null;
        radarInFlightParams = null;
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
        el.style.position = "fixed";
        el.style.pointerEvents = "none";
        el.style.background = "rgba(0,0,0,0.75)";
        el.style.color = "#fff";
        el.style.padding = "4px 6px";
        el.style.borderRadius = "4px";
        el.style.fontSize = "12px";
        el.style.zIndex = 10000;
        el.style.transform = "translate(10px, -10px)";
        el.style.display = "none";
        document.body.appendChild(el);
    }
    return el;
}

function _bindRadarHover() {
    if (!radarHoverEnabled) return;
    if (!radarLayer || radarHoverHandler) return;
    const tooltip = _ensureRadarHoverTooltip();
    radarHoverHandler = (e) => {
        if (!radarLayer || !radarLayer.getValueAtLatLng) return;
        const sample = radarLayer.getValueAtLatLng(e.latlng);
        if (!sample) {
            tooltip.style.display = "none";
            return;
        }

        let text = "";
        if (sample.product === "classification") {
            text = `${sample.label} (code ${sample.code})`;
        } else if (sample.units === "m/s") {
            const mph = sample.value * 2.23694;
            text = `${sample.value.toFixed(1)} m/s (${mph.toFixed(1)} mph)`;
        } else if (sample.units) {
            text = `${sample.value.toFixed(1)} ${sample.units}`;
        } else {
            text = sample.value.toFixed(1);
        }

        tooltip.textContent = text;
        tooltip.style.left = `${e.originalEvent.clientX + 8}px`;
        tooltip.style.top = `${e.originalEvent.clientY - 8}px`;
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
    if (userSettings.opacity.radar == 0) {
        console.error(
            "Radar layer opacity is set to 0, no need to load new radar data, skipping."
        );
        clearRadarLayerById();
        removeRadar();
        return;
    }

    const radarMode = config.radarApi?.mode || "wms";
    if (radarMode === "site") {
        const radarSite = (config.radarApi?.site || "").trim().toUpperCase();
        const radarProduct = normalizeRadarProduct(config.radarApi?.product || "reflectivity");
        if (!radarSite) {
            console.warn("Radar site mode enabled but no site is set.");
            clearRadarLayerById();
            removeRadar();
            return;
        }

        if (radarActiveMode !== "site") {
            clearRadarLayerById();
        }
        const forceNewest = radarNeedsInitialForce;
        if (forceNewest) {
            setRadarSiteStatus(`Using saved site: ${radarSite}`);
        } else {
            setRadarSiteStatus(`Current site: ${radarSite}`);
        }
        setBottomRadarStatus(`Radar Status: Fetching ${radarProductLabel(radarProduct)} for ${radarSite}...`);
        radarNeedsInitialForce = false;
        radarActiveMode = "site";
        loadRadarForSite(radarSite, null, forceNewest);
        return;
    }

    removeRadar();

    let radarTileMap = userSettings.radarTilemap;
    if (radarTileMap == undefined) radarTileMap = "n0q";

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

    L.tileLayer
        .wms(
            `https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/${radarTileMap}.cgi`,
            {
                layers: `nexrad-${radarTileMap}-900913`,
                format: "image/png",
                transparent: true,
                attribution: "Weather data © 2024 IEM Nexrad",
                id: "radar-layer",
                opacity: config.opacity.radar,
            }
        )
        .addTo(map);
    radarActiveMode = "wms";
    setBottomRadarStatus(`Radar Status: Source IEM [${radarTileMap.toUpperCase()}]`);
    console.info("Radar layer updated.");
}

// Initialize custom colormaps on load
loadCustomColormaps();
