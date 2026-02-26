let radarLayer = null;
let radarRefreshInterval = null;
let radarSelectedSite = null;
let radarLastKey = null;
let radarLastSite = null;
let radarLastProduct = null;
let radarLastCmap = null;
let radarNeedsInitialForce = true;
let radarActiveMode = null;
let radarFetchController = null; // AbortController for in-flight fetch
const RADAR_SWEEP_CACHE = new Map(); // browser-side sweep data cache
const RADAR_SWEEP_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RADAR_SITE_FAILURE_THRESHOLD = 3;
const radarSiteFailureCounts = {};
const radarSiteFailureNotified = new Set();
const RADAR_AUTO_PRODUCTS = new Set(["reflectivity", "srv"]);

// ── Per-product colormap defaults and built-in options ──
const DEFAULT_COLORMAPS = {
    reflectivity: "NWSRef",
    velocity: "NWSVel",
    srv: "NWSVel",
    cc: "NWSCC",
    classification: "Grayscale",
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
        { value: "Grayscale", label: "Grayscale (Default)" },
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
                    // Simple .pal support: lines of "R G B" (0-255). Build an interpolated colormap.
                    const lines = text
                        .split(/\r?\n/)
                        .map((ln) => ln.trim())
                        .filter((ln) => ln && !ln.startsWith("#"));
                    const colors = lines
                        .map((ln) => ln.split(/[\s,]+/).map((v) => parseInt(v, 10)))
                        .filter((arr) => arr.length >= 3 && arr.every((v) => Number.isFinite(v)));
                    if (!colors.length) {
                        throw new Error("Invalid .pal file: expected lines of 'R G B'");
                    }
                    const stops = colors.map((rgb, idx) => {
                        const t = colors.length === 1 ? 1 : idx / (colors.length - 1);
                        return [t, rgb[0], rgb[1], rgb[2], 200];
                    });
                    name = file.name.replace(/\.pal$/i, "");
                    cmapData = { type: "interpolated", stops };
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

    const exportData = {
        name: colormapName,
        product: normalized,
        type: cmapData.type,
        stops: cmapData.stops,
        exported: new Date().toISOString(),
    };
    if (cmapData.alpha != null) exportData.alpha = cmapData.alpha;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${colormapName}_${normalized}.json`;
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

function isCustomColormap(product, colormapName) {
    const normalized = normalizeRadarProduct(product);
    return !!(customColormaps[normalized] && customColormaps[normalized][colormapName]);
}

function setRadarSiteStatus(message) {
    const status = document.getElementById("radar-site-status");
    if (!status) return;
    status.textContent = message || "";
}

function setBottomRadarStatus(message) {
    const status = document.getElementById("radar-runtime-status");
    if (!status) return;
    status.textContent = message || "";
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
        classification: "Classification",
    };
    return labels[normalized] || "Reflectivity";
}

function handleRepeatedRadarSiteFailure(site, error) {
    const message = `Radar site ${site} failed repeatedly. Switched to WMS. You may want to hide that site.`;
    console.error(message, error);

    if (!radarSiteFailureNotified.has(site)) {
        radarSiteFailureNotified.add(site);
        try {
            window.alert(message);
        } catch (_) {}
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

// ── Client-side canvas rendering from sweep data (Attic Radar style) ──

async function fetchSweepData(site, force = false, signal = null) {
    const radarApi = getRadarApiConfig();
    const base = radarApi.base;
    const product = normalizeRadarProduct(radarApi.product || "reflectivity");
    const cacheKey = `${site.toUpperCase()}:${product}`;

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

        // Cancel any in-flight fetch before starting a new one
        if (radarFetchController) {
            radarFetchController.abort();
            radarFetchController = null;
        }
        radarFetchController = new AbortController();
        const signal = radarFetchController.signal;

        setBottomRadarStatus(`Radar Status: Fetching ${radarProductLabel(requestedProduct)} for ${site}...`);

        // Client-side canvas rendering from sweep data (Attic Radar style)
        const sweepData = await fetchSweepData(site, force, signal);
        radarFetchController = null;
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
                `Radar Status: Last Updated ${new Date().toLocaleTimeString()} | Type: ${radarProductLabel(resolvedProduct)} | Site: ${resolvedSite}`
            );
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
            `Radar Status: Last Updated ${new Date().toLocaleTimeString()} | Type: ${radarProductLabel(resolvedProduct)} | Site: ${resolvedSite}`
        );
        return true;
    } catch (error) {
        // If aborted (user switched site), silently ignore
        if (error.name === "AbortError") {
            console.log("Radar fetch aborted (site changed)");
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

function startRadarAutoRefresh() {
    if (radarRefreshInterval) {
        clearInterval(radarRefreshInterval);
        radarRefreshInterval = null;
    }

    const product = normalizeRadarProduct(config.radarApi?.product || "reflectivity");
    if (!RADAR_AUTO_PRODUCTS.has(product)) {
        return;
    }

    radarRefreshInterval = setInterval(async () => {
        if (!radarSelectedSite) return;
        await loadRadarForSite(radarSelectedSite, null, false);
    }, getRadarApiConfig().pollIntervalMs);
}

function removeRadar() {
    if (radarLayer) {
        map.removeLayer(radarLayer);
        radarLayer = null;
    }
    document.querySelectorAll(".radar.selected-radar").forEach((label) => {
        label.classList.remove("selected-radar");
    });
    if (radarRefreshInterval) {
        clearInterval(radarRefreshInterval);
        radarRefreshInterval = null;
    }
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
    }
    setRadarSiteStatus("");
    setBottomRadarStatus("");
    hideRadarColorbar();
    console.log("Radar layer removed");
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
        loadRadarForSite(radarSite, null, forceNewest).then(() => {
            startRadarAutoRefresh();
        });
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
