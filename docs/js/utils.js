/** @format */

function timePassedAsSeconds(time) {
	const now = new Date();
	const timeDiff = now - time;
	const seconds = Math.floor(timeDiff / 1000);
	return seconds;
}

/** @format */

function convertToText(text) {
	textArr = text.split("#");
	if (textArr.length > 1) text = textArr[0];
	text = text.trim().toTitleCase(); // <- This is here because I'm probably gonna make a mistake somewhere
	return text;
}

// Define a function to get the color based on the type of the alert
function getColor(text) {
	return getConfiguredAlertColor(text);
}

const colorsArray = {
	"Tsunami Warning": "#FD6347",
	"Tornado Warning": "#ff0000",
	"Extreme Wind Warning": "#FF8C00",
	"Severe Thunderstorm Warning": "#FFA500",
	"Flash Flood Warning": "#00FF00",
	"Flash Flood Statement": "#00FF00",
	"Severe Weather Statement": "#00FFFF",
	"Shelter In Place Warning": "#FA8072",
	"Evacuation Immediate": "#7FFF00",
	"Civil Danger Warning": "#FFB6C1",
	"Nuclear Power Plant Warning": "#4B0082",
	"Radiological Hazard Warning": "#4B0082",
	"Hazardous Materials Warning": "#4B0082",
	"Fire Warning": "#A0522D",
	"Civil Emergency Message": "#FFB6C1",
	"Law Enforcement Warning": "#C0C0C0",
	"Storm Surge Warning": "#B524F7",
	"Hurricane Force Wind Warning": "#CD5C5C",
	"Hurricane Warning": "#DC143C",
	"Typhoon Warning": "#DC143C",
	"Special Marine Warning": "#db7093",
	"Blizzard Warning": "#FF4500",
	"Snow Squall Warning": "#C71585",
	"Ice Storm Warning": "#8B008B",
	"Heavy Freezing Spray Warning": "#00BFFF",
	"Winter Storm Warning": "#FF69B4",
	"Lake Effect Snow Warning": "#008B8B",
	"Dust Storm Warning": "#FFE4C4",
	"Blowing Dust Warning": "#FFE4C4",
	"High Wind Warning": "#DAA520",
	"Tropical Storm Warning": "#B22222",
	"Storm Warning": "#9400D3",
	"Tsunami Advisory": "#D2691E",
	"Tsunami Watch": "#FF00FF",
	"Avalanche Warning": "#1E90FF",
	"Earthquake Warning": "#8B4513",
	"Volcano Warning": "#2F4F4F",
	"Ashfall Warning": "#A9A9A9",
	"Flood Warning": "#00FF00",
	"Coastal Flood Warning": "#228B22",
	"Lakeshore Flood Warning": "#228B22",
	"Ashfall Advisory": "#696969",
	"High Surf Warning": "#228B22",
	"Excessive Heat Warning": "#C71585",
	"Tornado Watch": "#840404",
	"Severe Thunderstorm Watch": "#8B8000",
	"Flash Flood Watch": "#2E8B57",
	"Gale Warning": "#DDA0DD",
	"Flood Statement": "#00FF00",
	"Extreme Cold Warning": "#0000FF",
	"Freeze Warning": "#483D8B",
	"Red Flag Warning": "#FF1493",
	"Storm Surge Watch": "#DB7FF7",
	"Hurricane Watch": "#FF00FF",
	"Hurricane Force Wind Watch": "#9932CC",
	"Typhoon Watch": "#FF00FF",
	"Tropical Storm Watch": "#F08080",
	"Storm Watch": "#FFE4B5",
	"Tropical Cyclone Local Statement": "#FFE4B5",
	"Winter Weather Advisory": "#7B68EE",
	"Avalanche Advisory": "#CD853F",
	"Cold Weather Advisory": "#AFEEEE",
	"Heat Advisory": "#FF7F50",
	"Flood Advisory": "#00FF7F",
	"Coastal Flood Advisory": "#7CFC00",
	"Lakeshore Flood Advisory": "#7CFC00",
	"High Surf Advisory": "#BA55D3",
	"Dense Fog Advisory": "#708090",
	"Dense Smoke Advisory": "#F0E68C",
	"Small Craft Advisory": "#D8BFD8",
	"Brisk Wind Advisory": "#D8BFD8",
	"Hazardous Seas Warning": "#D8BFD8",
	"Dust Advisory": "#BDB76B",
	"Blowing Dust Advisory": "#BDB76B",
	"Lake Wind Advisory": "#D2B48C",
	"Wind Advisory": "#D2B48C",
	"Frost Advisory": "#6495ED",
	"Freezing Fog Advisory": "#008080",
	"Freezing Spray Advisory": "#00BFFF",
	"Low Water Advisory": "#A52A2A",
	"Local Area Emergency": "#C0C0C0",
	"Winter Storm Watch": "#4682B4",
	"Rip Current Statement": "#40E0D0",
	"Beach Hazards Statement": "#40E0D0",
	"Gale Watch": "#FFC0CB",
	"Avalanche Watch": "#F4A460",
	"Hazardous Seas Watch": "#483D8B",
	"Heavy Freezing Spray Watch": "#BC8F8F",
	"Flood Watch": "#2E8B57",
	"Coastal Flood Watch": "#66CDAA",
	"Lakeshore Flood Watch": "#66CDAA",
	"High Wind Watch": "#B8860B",
	"Excessive Heat Watch": "#800000",
	"Extreme Cold Watch": "#5F9EA0",
	"Freeze Watch": "#00FFFF",
	"Fire Weather Watch": "#FFDEAD",
	"Extreme Fire Danger": "#E9967A",
	"911 Telephone Outage": "#C0C0C0",
	"Coastal Flood Statement": "#6B8E23",
	"Lakeshore Flood Statement": "#6B8E23",
	"Special Weather Statement": "#add8e6",
	"Marine Weather Statement": "#9932cc",
	"Air Quality Alert": "#808080",
	"Air Stagnation Advisory": "#808080",
	"Hazardous Weather Outlook": "#EEE8AA",
	"Hydrologic Outlook": "#90EE90",
	"Short Term Forecast": "#98FB98",
	"Administrative Message": "#C0C0C0",
	"Test": "#F0FFFF",
	"Child Abduction Emergency": "#FFFFFF",
	"Blue Alert": "#FFFFFF",

	"Heavy Snow Warning": "#8A2BE2",
	"Inland Tropical Storm Warning": "#B22222",
	"Inland Hurricane Wind Warning": "#CD5C5C",
	"Hurricane Local Statement": "#9370DB",
	"Typhoon Local Statement": "#9370DB",
	"Snow And Blowing Snow Advisory": "#B0E0E6",
	"Freezing Rain Advisory": "#6A5ACD",
	"Freezing Drizzle Advisory": "#6A5ACD",
	"Sleet Advisory": "#7B68EE",
	"Blowing Snow Advisory": "#ADD8E6",
	"Snow Advisory": "#6699CC",
	"Inland Tropical Storm Watch": "#F08080",
	"Inland Hurricane Wind Watch": "#FFA07A",
	"Tropical Cyclone Watch": "#F08080",
	"Tropical Cyclone Warning": "#B22222",
	"Wind Chill Warning": "#B0C4DE",
	"Wind Chill Watch": "#5F9EA0",
	"Wind Chill Advisory": "#AFEEEE",
	"Heavy Sleet Warning": "#87CEEB",
	"Fire Danger Statement": "#E9967A",
	"Evacuation - Immediate": "#7FFF00",
	"Default": "#FFFFFF",
};

const log_features = ["Tornado Watch", "Severe Thunderstorm Watch"];

// Our current features so we can cache them locally so we don't have to fetch them every time.
let current_features, counties, countyBordersLayer;
// Some dev shenangians
if (config.dev.status) {
	console.info("Development mode is enabled.");
	console.info(
		"Logging these features (warnings):",
		(log_features || ["None"]).toString()
	);
}

// Add state borders to the map
window.countyBordersShown = false;

async function fetchCountyBorders() {
	// Cache once so repeated calls don't re-fetch
	if (counties) return counties;
	counties = await (await fetch("./json/counties.json")).json();
	return counties;
}

function getZoom() {
	try {
		return map.getZoom();
	} catch (e) {
		return 9;
	}
}

window.countyBordersShown = true;

async function addCountyBorders() {
	if (!counties) {
		try {
			await fetchCountyBorders();
		} catch (e) {
			console.warn("Unable to load county borders:", e);
			return;
		}
	}

	if (config.countyBordersZoomOnly && getZoom() < 9) {
		if (countyBordersLayer) {
			map.removeLayer(countyBordersLayer);
			countyBordersLayer = null;
			console.info("Hiding county borders.");
		}
		window.countyBordersShown = false;
		return;
	}
	if (!countyBordersLayer) {
		countyBordersLayer = L.geoJSON(counties, {
			style: {
				color: getColor("county"), // Light gray for border color
				weight: 3 * (map.getZoom() / 9), // Border width
				opacity: config.opacity.countyBorders, // low opacity
				fillOpacity: 0, // Make the polygon fill transparent
			},
			id: "county-borders",
			interactive: false,
		})
			.addTo(map)
			.bringToFront();
		console.info("Showing county borders.");
	} else {
		countyBordersLayer.setStyle({
			opacity: config.opacity.countyBorders,
			weight: 3 * (map.getZoom() / 9),
		});
		countyBordersLayer.bringToFront();
	}
	window.countyBordersShown = true;
}

// Function to format the expiration time
function formatExpirationTime(expirationTime) {
	const expirationDate = new Date(expirationTime);
	const now = new Date();
	const timeDiff = expirationDate - now;

	const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
	const hours = Math.floor(
		(timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
	);
	const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

	let formattedTime = "";
	if (days > 0) {
		formattedTime += `${days}d `;
	}
	if (hours > 0 || days > 0) {
		formattedTime += `${hours}h `;
	}
	formattedTime += `${minutes}m ${seconds}s`;

	return formattedTime.trim();
}

// Function to get the popup text based on the feature
function getPopupText(feature) {
	let weatherEvent = feature.properties.event;

	if (log_features.matchesAny(weatherEvent) && config.dev.status) {
		console.info(feature);
	}

	const popupContent = `
		  ${asText(getSevereStorm(feature))}
		  <div id="btn-div" style="align-items: center; display: flex; justify-content: center; padding: 0px;">
		  <button id="show-alert-text" style="margin-top: 10px; border-radius: 5px; background-color: #007bff; color: white; border: none; cursor: pointer;">
			  Show Alert Text
		  </button>
		  </div>
	  `;

	return popupContent;
}

// Function to clear existing layers
function clearLayers(layerIds) {
	try {
		map.eachLayer((layer) => {
			if (layer.options && layerIds.includes(layer.options.id)) {
				unregisterMapHitStackLayer(layer);
				map.removeLayer(layer);
			}
		});
	} catch (e) {
		console.warn(e);
	}
}

function getAlertEventType(eventName) {
	return String(eventName || "")
		.replace(/\s+#\d+\s*$/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function normalizeAlertEventType(eventName) {
	return getAlertEventType(eventName).toLowerCase();
}

function normalizeDisabledAlertTypes() {
	const normalizedToLabel = new Map();
	for (const eventType of config.disabledAlertTypes || []) {
		const label = getAlertEventType(eventType);
		if (!label) continue;
		normalizedToLabel.set(normalizeAlertEventType(label), label);
	}
	config.disabledAlertTypes = Array.from(normalizedToLabel.values());
	return new Set(normalizedToLabel.keys());
}

function isAlertEventTypeDisabled(eventName) {
	const disabled = new Set((config.disabledAlertTypes || []).map(normalizeAlertEventType));
	return disabled.has(normalizeAlertEventType(eventName));
}

function getFilteredAlertData(data) {
	if (!data || !Array.isArray(data.features)) return data;
	return {
		...data,
		features: data.features.filter((feature) => {
			const eventType = feature?.properties?.watchEvent || feature?.properties?.event;
			return !isAlertEventTypeDisabled(eventType);
		}),
	};
}

function getDefaultAlertTypeFilters() {
	const alertColors = typeof colorsArray === "object" && colorsArray ? colorsArray : {};
	return Object.keys(alertColors)
		.filter((eventType) => /\b(warning|statement|watch)\b/i.test(eventType))
		.filter((eventType) => eventType !== "Warning")
		.sort((a, b) => {
			const rank = (value) => {
				const eventType = value.toLowerCase();
				if (eventType.includes("warning")) return 0;
				if (eventType.includes("statement")) return 1;
				if (eventType.includes("watch")) return 2;
				return 3;
			};
			const rankDiff = rank(a) - rank(b);
			return rankDiff || a.localeCompare(b);
		});
}

function getAlertTypeFilterOptions() {
	const byKey = new Map();
	for (const eventType of getDefaultAlertTypeFilters()) {
		byKey.set(normalizeAlertEventType(eventType), getAlertEventType(eventType));
	}

	const activeFeatures = current_features && Array.isArray(current_features.features)
		? current_features.features
		: [];
	for (const feature of activeFeatures) {
		const eventType = getAlertEventType(feature?.properties?.watchEvent || feature?.properties?.event);
		if (!eventType || !/\b(warning|statement|watch)\b/i.test(eventType)) continue;
		byKey.set(normalizeAlertEventType(eventType), eventType);
	}

	return Array.from(byKey.values()).sort((a, b) => {
		const rank = (value) => {
			const eventType = value.toLowerCase();
			if (eventType.includes("warning")) return 0;
			if (eventType.includes("statement")) return 1;
			if (eventType.includes("watch")) return 2;
			return 3;
		};
		const rankDiff = rank(a) - rank(b);
		return rankDiff || a.localeCompare(b);
	});
}

function setAlertTypeEnabled(eventType, enabled) {
	const label = getAlertEventType(eventType);
	if (!label) return;

	const disabledByKey = new Map();
	for (const disabledType of config.disabledAlertTypes || []) {
		const disabledLabel = getAlertEventType(disabledType);
		if (disabledLabel) disabledByKey.set(normalizeAlertEventType(disabledLabel), disabledLabel);
	}

	if (enabled) {
		disabledByKey.delete(normalizeAlertEventType(label));
	} else {
		disabledByKey.set(normalizeAlertEventType(label), label);
	}

	config.disabledAlertTypes = Array.from(disabledByKey.values());
	localStorage.setItem("weatherAppSettings", JSON.stringify(config));
	redrawPolygons();
	renderAlertTypeFilters();
}

function renderAlertTypeFilters() {
	const container = document.getElementById("alert-type-filter-list");
	if (!container) return;

	const disabled = normalizeDisabledAlertTypes();
	const options = getAlertTypeFilterOptions();
	container.innerHTML = "";

	for (const eventType of options) {
		const label = document.createElement("label");
		label.className = "alert-type-filter-option";
		label.title = eventType;

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.checked = !disabled.has(normalizeAlertEventType(eventType));
		checkbox.addEventListener("change", () => {
			setAlertTypeEnabled(eventType, checkbox.checked);
		});

		const text = document.createElement("span");
		text.textContent = eventType;

		label.appendChild(checkbox);
		label.appendChild(text);
		container.appendChild(label);
	}

	const enableAllButton = document.getElementById("alert-type-enable-all");
	if (enableAllButton) {
		enableAllButton.disabled = (config.disabledAlertTypes || []).length === 0;
		enableAllButton.onclick = () => {
			config.disabledAlertTypes = [];
			localStorage.setItem("weatherAppSettings", JSON.stringify(config));
			redrawPolygons();
			renderAlertTypeFilters();
		};
	}
}

const ALERT_VARIANT_COLOR_DEFAULTS = {
	"tornado.considerable.base": {
		label: "Tornado Warning - Considerable main",
		defaultColor: "#ff00ff",
	},
	"tornado.catastrophic.base": {
		label: "Tornado Warning - Catastrophic main",
		defaultColor: "#ff00ff",
	},
	"tornado.observed.extra": {
		label: "Tornado Warning - Observed overlay",
		defaultColor: "#000000",
	},
	"tornado.catastrophic.extra": {
		label: "Tornado Warning - Catastrophic overlay",
		defaultColor: "#000000",
	},
	"severeThunderstorm.destructive.extra": {
		label: "Severe Thunderstorm Warning - Destructive overlay",
		defaultColor: "#ff0000",
	},
	"severeThunderstorm.considerable.extra": {
		label: "Severe Thunderstorm Warning - Considerable overlay",
		defaultColor: "#ff0000",
	},
	"severeThunderstorm.possible.extra": {
		label: "Severe Thunderstorm Warning - Tornado possible overlay",
		defaultColor: "#000000",
	},
};

function normalizeHexColor(value) {
	const color = String(value || "").trim();
	const shortMatch = color.match(/^#?([0-9a-f]{3})$/i);
	if (shortMatch) {
		return "#" + shortMatch[1].split("").map((char) => char + char).join("").toLowerCase();
	}
	const fullMatch = color.match(/^#?([0-9a-f]{6})$/i);
	return fullMatch ? "#" + fullMatch[1].toLowerCase() : null;
}

function normalizeAlertColorValue(value) {
	if (Array.isArray(value)) {
		for (const entry of value) {
			const normalized = normalizeAlertColorValue(entry);
			if (normalized) return normalized;
		}
		return null;
	}

	const hex = normalizeHexColor(value);
	if (hex) return hex;

	const color = String(value || "").trim();
	return /^(?:rgb|hsl)a?\([^)]+\)$/i.test(color) ? color : null;
}

function getAlertTableColor(eventType) {
	const label = convertToText(getAlertEventType(eventType));
	return normalizeHexColor(colorsArray[label]) ||
		normalizeHexColor(colorsArray[getAlertEventType(eventType)]);
}

function getDefaultAlertColor(eventType) {
	return getAlertTableColor(eventType) ||
		normalizeHexColor(colorsArray.Default) ||
		"#ffffff";
}

function getConfiguredAlertColor(eventType) {
	const key = normalizeAlertEventType(eventType);
	const configured = normalizeHexColor(config.alertColors && config.alertColors[key]);
	return configured || getDefaultAlertColor(eventType);
}

function getConfiguredOrTableAlertColor(eventType) {
	const key = normalizeAlertEventType(eventType);
	const configured = normalizeHexColor(config.alertColors && config.alertColors[key]);
	return configured || getAlertTableColor(eventType);
}

function getAlertVariantColor(variantKey) {
	const variant = ALERT_VARIANT_COLOR_DEFAULTS[variantKey];
	const configured = normalizeHexColor(config.alertVariantColors && config.alertVariantColors[variantKey]);
	return configured || normalizeHexColor(variant?.defaultColor) || "#ffffff";
}

function saveAlertColorSettings() {
	localStorage.setItem("weatherAppSettings", JSON.stringify(config));
}

function setAlertColor(eventType, color) {
	const key = normalizeAlertEventType(eventType);
	const normalizedColor = normalizeHexColor(color);
	if (!key || !normalizedColor) return;
	if (!config.alertColors) config.alertColors = {};
	const defaultColor = getDefaultAlertColor(eventType);
	if (normalizedColor === defaultColor) {
		delete config.alertColors[key];
	} else {
		config.alertColors[key] = normalizedColor;
	}
	saveAlertColorSettings();
	redrawPolygons();
	renderAlertColorManager();
}

function resetAlertColor(eventType) {
	const key = normalizeAlertEventType(eventType);
	if (config.alertColors && key) delete config.alertColors[key];
	saveAlertColorSettings();
	redrawPolygons();
	renderAlertColorManager();
}

function setAlertVariantColor(variantKey, color) {
	const normalizedColor = normalizeHexColor(color);
	const variant = ALERT_VARIANT_COLOR_DEFAULTS[variantKey];
	if (!variant || !normalizedColor) return;
	if (!config.alertVariantColors) config.alertVariantColors = {};
	const defaultColor = normalizeHexColor(variant.defaultColor);
	if (normalizedColor === defaultColor) {
		delete config.alertVariantColors[variantKey];
	} else {
		config.alertVariantColors[variantKey] = normalizedColor;
	}
	saveAlertColorSettings();
	redrawPolygons();
	renderAlertColorManager();
}

function resetAlertVariantColor(variantKey) {
	if (config.alertVariantColors) delete config.alertVariantColors[variantKey];
	saveAlertColorSettings();
	redrawPolygons();
	renderAlertColorManager();
}

function getAlertColorOptions() {
	const byKey = new Map();
	for (const eventType of Object.keys(colorsArray)) {
		if (eventType === "Default") continue;
		byKey.set(normalizeAlertEventType(eventType), getAlertEventType(eventType));
	}

	const activeFeatures = current_features && Array.isArray(current_features.features)
		? current_features.features
		: [];
	for (const feature of activeFeatures) {
		const eventType = getAlertEventType(feature?.properties?.watchEvent || feature?.properties?.event);
		if (!eventType) continue;
		byKey.set(normalizeAlertEventType(eventType), eventType);
	}

	return Array.from(byKey.values()).sort((a, b) => {
		const rank = (value) => {
			const eventType = value.toLowerCase();
			if (eventType.includes("warning")) return 0;
			if (eventType.includes("statement")) return 1;
			if (eventType.includes("watch")) return 2;
			if (eventType.includes("advisory")) return 3;
			if (eventType.includes("outlook")) return 4;
			return 5;
		};
		const rankDiff = rank(a) - rank(b);
		return rankDiff || a.localeCompare(b);
	});
}

function createAlertColorRow({ label, value, defaultValue, onChange, onReset }) {
	const row = document.createElement("div");
	row.className = "alert-color-row";

	const picker = document.createElement("input");
	picker.type = "color";
	picker.value = value;
	picker.title = label;
	picker.addEventListener("change", () => onChange(picker.value));

	const name = document.createElement("span");
	name.className = "alert-color-name";
	name.textContent = label;
	name.title = label;

	const colorText = document.createElement("span");
	colorText.className = "alert-color-value";
	colorText.textContent = value;

	const resetButton = document.createElement("button");
	resetButton.type = "button";
	resetButton.className = "alert-color-reset";
	resetButton.innerHTML = '<i class="fas fa-undo"></i>';
	resetButton.title = "Reset to " + defaultValue;
	resetButton.setAttribute("aria-label", "Reset " + label + " color");
	resetButton.addEventListener("click", onReset);

	row.appendChild(picker);
	row.appendChild(name);
	row.appendChild(colorText);
	row.appendChild(resetButton);
	return row;
}

function renderAlertColorManager() {
	const container = document.getElementById("alert-color-manager");
	if (!container) return;
	container.innerHTML = "";

	const baseSection = document.createElement("div");
	baseSection.className = "alert-color-section";
	const baseTitle = document.createElement("div");
	baseTitle.className = "alert-color-section-title";
	baseTitle.textContent = "Base Alert Types";
	baseSection.appendChild(baseTitle);

	for (const eventType of getAlertColorOptions()) {
		baseSection.appendChild(createAlertColorRow({
			label: eventType,
			value: getConfiguredAlertColor(eventType),
			defaultValue: getDefaultAlertColor(eventType),
			onChange: (color) => setAlertColor(eventType, color),
			onReset: () => resetAlertColor(eventType),
		}));
	}

	const variantSection = document.createElement("div");
	variantSection.className = "alert-color-section";
	const variantTitle = document.createElement("div");
	variantTitle.className = "alert-color-section-title";
	variantTitle.textContent = "Storm Variant Overlays";
	variantSection.appendChild(variantTitle);

	for (const [variantKey, variant] of Object.entries(ALERT_VARIANT_COLOR_DEFAULTS)) {
		variantSection.appendChild(createAlertColorRow({
			label: variant.label,
			value: getAlertVariantColor(variantKey),
			defaultValue: normalizeHexColor(variant.defaultColor),
			onChange: (color) => setAlertVariantColor(variantKey, color),
			onReset: () => resetAlertVariantColor(variantKey),
		}));
	}

	container.appendChild(baseSection);
	container.appendChild(variantSection);

	const resetAllButton = document.getElementById("alert-color-reset-all");
	if (resetAllButton) {
		const hasCustomColors = Object.keys(config.alertColors || {}).length > 0 ||
			Object.keys(config.alertVariantColors || {}).length > 0;
		resetAllButton.disabled = !hasCustomColors;
		resetAllButton.onclick = () => {
			config.alertColors = {};
			config.alertVariantColors = {};
			saveAlertColorSettings();
			redrawPolygons();
			renderAlertColorManager();
		};
	}
}

async function addCountdown() {
	const countdownElement =
		document.getElementById("radar-runtime-timer") ||
		document.getElementById("countdown");
	if (countdownElement) {
		countdownElement.innerText = "Next update in: 60s";
	}
}

// Function to update the countdown timer
function updateCountdown(force) {
	force = force || false;
	if (window.countdownIsRunning && !force) {
		return console.warn("The countdown is already active, skipping.");
	}
	const countdownElement =
		document.getElementById("radar-runtime-timer") ||
		document.getElementById("countdown");
	let timeLeft = 60;
	window.timeUntilNextUpdate = timeLeft;
	window.countdownIsRunning = true;
	window.lastUpdate = new Date();

	setInterval(() => {
		timeLeft = window.timeUntilNextUpdate;
		timeLeft -= 1;
		if (countdownElement) {
			if (timeLeft < 10) {
				timeLeft = `0${timeLeft}`;
			}
			countdownElement.innerText = `Next update in: ${timeLeft}s`;
		}

		if (timeLeft <= 0) {
			timeLeft = 60;
			window.timeUntilNextUpdate = timeLeft;
			updateWeatherAlerts();
			updateRadarLayer(true);
		}
		window.timeUntilNextUpdate = timeLeft;
	}, 1000);
}

function drawPolygons(data) {
	const size = 4;
	const change = 2;

	// Pick a single highest-priority alert per marker+event to avoid repeat TTS
	function getAlertPriority(eventType, tag) {
		const evt = (eventType || "").toLowerCase();
		const tg = (tag || "").toLowerCase();

		if (evt.includes("severe th")) {
			// Catastrophic/Destructive > Considerable > Base
			if (tg === "catastrophic" || tg === "destructive") return 3;
			if (tg === "considerable") return 2;
			return 1;
		}

		if (evt.includes("tornado")) {
			// Catastrophic > Considerable > Observed > Base
			if (tg === "catastrophic") return 4;
			if (tg === "considerable") return 3;
			if (tg === "observed") return 2;
			return 1;
		}

		// Default priority for everything else
		return 1;
	}

	// Draw lower-priority alerts first so tornado warnings stay visually on top.
	function getRenderPriority(feature) {
		const evt = ((feature?.properties?.event || "") + "").toLowerCase();

		if (evt.includes("tornado warning")) return 40;
		if (evt.includes("severe thunderstorm warning")) return 30;
		if (evt.includes("warning")) return 20;
		if (evt.includes("statement")) return 15;
		if (evt.includes("watch")) return 10;
		return 0;
	}

	// Draw lower-priority alerts first so tornado warnings stay visually on top.
	function getRenderPriority(feature) {
		const evt = ((feature?.properties?.event || "") + "").toLowerCase();

		if (evt.includes("tornado warning")) return 40;
		if (evt.includes("severe thunderstorm warning")) return 30;
		if (evt.includes("warning")) return 20;
		if (evt.includes("statement")) return 15;
		if (evt.includes("watch")) return 10;
		return 0;
	}

	// Keep watches and warnings separate when deduping
	function dedupeCategory(eventType) {
		const evt = (eventType || "").toLowerCase();
		if (evt.includes("watch")) return `watch:${eventType}`;
		if (evt.includes("warning")) return `warning:${eventType}`;
		return `other:${eventType}`;
	}

	function getAlertDisplayName(feature, tag) {
		const event = feature?.properties?.event || "Weather Alert";
		const eventName = event.toLowerCase();
		const cleanTag = String(tag || "").trim().toLowerCase();
		const shouldPrefix = cleanTag &&
			cleanTag !== "n/a" &&
			cleanTag !== "na" &&
			cleanTag !== "none" &&
			!eventName.includes("watch");

		return shouldPrefix ? `${cleanTag.toTitleCase()} ${event}` : event;
	}

	function getAlertStrokeColor(feature) {
		return normalizeAlertColorValue(feature?.properties?.appColor) ||
			getConfiguredOrTableAlertColor(feature?.properties?.event) ||
			normalizeAlertColorValue(feature?.properties?.color) ||
			normalizeAlertColorValue(feature?.properties?.watchColor) ||
			normalizeHexColor(colorsArray.Default) ||
			"#ffffff";
	}

	// Always clear previous alert layers so expired alerts disappear
	clearLayers([
		"weather-alerts",
		"weather-alerts-border",
		"weather-alerts-background",
		"alert-extras",
	]);

	if (config.opacity.polygon == 0) return;

	let alertExtras = structuredClone(data);
	alertExtras.features = [];

	let alertBackgrounds = structuredClone(data);
	alertBackgrounds.features = [];

	for (let feature of data.features) {
		if (!feature.properties.parameters.tornado)
			feature.properties.parameters.tornado = { possible: "" };

		let eventName = feature.properties.event.toLowerCase();
		let tag =
			feature.properties.parameters.tornadoDamageThreat ||
			feature.properties.parameters.thunderstormDamageThreat ||
			"";
		if (typeof tag != "string") {
			try {
				tag = tag[0];
			} catch (e) { }
		}

		if (config.dev.status === true) {
			console.log(
				"Got data for tag: " +
				tag +
				" or as JSON.stringify(): " +
				JSON.stringify(tag)
			);
		}

		if (typeof tag != "string") {
			if (config.dev.status === true) {
				console.warn(
					"Previous data is not proper. Received type " +
					typeof tag +
					" when expected string. JSON.stringify() " +
					JSON.stringify(tag)
				);
			}
			continue;
		}

		tag = tag.toLowerCase();
		let torCert = "";
		let torPsbl = feature.properties.parameters.tornado.possible;

		try {
			torCert = feature.properties.parameters.tornadoDetection[0];
		} catch (e) { }

		const allTags = ["considerable", "catastrophic", "destructive"];
		if (!allTags.includes(tag) && eventName.includes("tornado")) {
			tag = torCert.toLowerCase();
		} else if (!allTags.includes(tag) && eventName.includes("severe thun")) {
			tag = torPsbl.toLowerCase();
		}

		let newFeature = structuredClone(feature);
		let pushFeature = false;
		feature.properties.newName = getAlertDisplayName(feature, tag);
		if (eventName.includes("tornado")) {
			switch (tag) {
				case "considerable":
					feature.properties.appColor = getAlertVariantColor("tornado.considerable.base");
					break;
				case "catastrophic":
					feature.properties.appColor = getAlertVariantColor("tornado.catastrophic.base");
					newFeature.properties.appColor = getAlertVariantColor("tornado.catastrophic.extra");
					pushFeature = true;
					break;
				case "observed":
					newFeature.properties.appColor = getAlertVariantColor("tornado.observed.extra");
					pushFeature = true;
					break;
				default:
					break;
			}
		} else if (eventName.includes("severe th")) {
			switch (tag) {
				case "destructive":
					newFeature.properties.appColor = getAlertVariantColor("severeThunderstorm.destructive.extra");
					//newfeature.properties.size.border = size - change;
					pushFeature = true;
					break;
				case "considerable":
					newFeature.properties.appColor = getAlertVariantColor("severeThunderstorm.considerable.extra");
					pushFeature = true;
					break;
				case "possible":
					newFeature.properties.appColor = getAlertVariantColor("severeThunderstorm.possible.extra");
					pushFeature = true;
					break;
				default:
					break;
			}
		}

		// alertExtras.features.push(feature);
		// if (pushFeature) alertBackgrounds.features.push(newFeature);
		feature.properties.size = {};
		feature.properties.tag = tag;
		if (pushFeature) {
			feature.properties.size.border = size + change;
			feature.properties.size.polygon = size;
			feature.properties.size.extra = tag === "considerable" || tag === "possible" ? 1 : size - change;
			newFeature.properties.size = feature.properties.size;
			newFeature.properties.tag = tag;
			alertExtras.features.push(newFeature);
		} else {
			feature.properties.size.border = size;
			feature.properties.size.polygon = size - change;
		}
		alertBackgrounds.features.push(feature);
	}

	alertBackgrounds.features.sort(
		(a, b) => getRenderPriority(a) - getRenderPriority(b)
	);
	alertExtras.features.sort(
		(a, b) => getRenderPriority(a) - getRenderPriority(b)
	);

	data = alertBackgrounds;

	L.geoJSON(data, {
		pane: "alertsPane",
		style: function (feature) {
			return {
				color: "black", // Outer border color
				weight: feature.properties.size.border + change || size + change, // Outer border width
				opacity: config.opacity.polygon, // Outer border opacity
				fillOpacity: 0, // Make the polygon fill transparent
			};
		},
		id: "weather-alerts-border",
		interactive: false,
	}).addTo(map);

	// Add the GeoJSON layer to the map with color coding
	L.geoJSON(data, {
		pane: "alertsPane",
		style: function (feature) {
			return {
				color: getAlertStrokeColor(feature), // Border color
				weight: feature.properties.size.polygon || size, // Border width
				opacity: config.opacity.polygon, // Outer border opacity
				fillOpacity: config.opacity.polygon_fill, // Polygon fill opacity
			};
		},
		onEachFeature: function (feature, layer) {
			const props = feature.properties || {};
			if (feature.properties) {
				layer.bindPopup(getPopupText(feature), { pane: "alertsPopupPane" });
			}

			layer.on("popupopen", function () {
				console.log("Popup opened for feature:", JSON.stringify(feature));
				window.cachedAlertText = getAlertText(feature);
			});
			registerMapHitStackLayer(layer, {
				groupId: "weather-alerts",
				kind: "Alert",
				label: props.newName || props.event || "Weather Alert",
			});
		},
		id: "weather-alerts",
	})
		.addTo(map)
		.bringToFront();

	L.geoJSON(alertExtras, {
		pane: "alertsPane",
		style: function (feature) {
			return {
				color: getAlertStrokeColor(feature), // Border color
				weight: feature.properties.size.extra || (size - (change + 2)), // Border width
				opacity: config.opacity.polygon, // Outer border opacity
				//fillOpacity: config.opacity.polygon_fill, // Polygon fill opacity
				fillOpacity: 0
			};
		},
		id: "alert-extras",
		interactive: false,
	})
		.addTo(map)
		.bringToFront();

	let markers = getAllUserMarkerPoints();

	// Track best alert per marker+event (to speak once) and all cache keys (to mark as spoken)
	const bestAlertsByMarkerEvent = new Map(); // key: "marker|event" -> { priority, markerName, alertName, cacheKey }
	const allCacheKeysByMarkerEvent = new Map(); // key: "marker|event" -> Set(cacheKey)

	// Collect current alert IDs to prune stale spoken alerts
	const currentAlertIds = new Set();

	for (let al of data.features) {
		try {
			if (!al.geometry || !al.geometry.coordinates) continue;
			let coordinates = al.geometry.coordinates[0];
			if (!coordinates) continue;
			const alertId = al.properties.id || al.id || al.properties.newName;
			for (let key of Object.keys(markers)) {
				const cacheKey = `${key}|${alertId}`;
				currentAlertIds.add(cacheKey);
				let lat = markers[key]["lat"];
				let lng = markers[key]["lng"];
				if (isPointInPolygon(lat, lng, coordinates)) {
					const eventType = convertToText(al.properties.event);
					const tagValue = al.properties.tag || "";
					const priority = getAlertPriority(eventType, tagValue);
						const dedupeKey = `${key}|${dedupeCategory(eventType)}`;

					if (!allCacheKeysByMarkerEvent.has(dedupeKey)) {
						allCacheKeysByMarkerEvent.set(dedupeKey, new Set());
					}
					allCacheKeysByMarkerEvent.get(dedupeKey).add(cacheKey);

					const existing = bestAlertsByMarkerEvent.get(dedupeKey);
					if (!existing || priority > existing.priority) {
						bestAlertsByMarkerEvent.set(dedupeKey, {
							priority,
							markerName: key,
							alertName: al.properties.newName,
							cacheKey,
						});
					}
				}
			}
		} catch (e) {
			console.error(e);
		}
	}

	// Speak only the highest-priority alert per marker+event; mark all duplicates as spoken
	for (const [dedupeKey, best] of bestAlertsByMarkerEvent.entries()) {
		if (!window.spokenAlerts.has(best.cacheKey)) {
			console.log(`${best.markerName} is inside ${best.alertName}`);
			playSound(best.markerName, best.alertName);
		}
	}

	for (const cacheSet of allCacheKeysByMarkerEvent.values()) {
		for (const key of cacheSet) {
			window.spokenAlerts.add(key);
		}
	}

	// Remove spoken alerts that no longer exist in current data
	for (const key of window.spokenAlerts) {
		if (!currentAlertIds.has(key)) {
			window.spokenAlerts.delete(key);
		}
	}
}

function redrawPolygons() {
	try {
		if (current_features.length <= 0) updateWeatherAlerts();
		else drawPolygons(getFilteredAlertData(current_features));
	} catch (e) {}
}

function getSevereStorm(feature) {
	// feature.properties.parameters.tornadoDamageThreat
	try {
		let weatherEvent = feature.properties.event;
		let weatherParams = feature.properties.parameters || {};
		if (feature.properties.description == undefined)
			throw new Error("No description found.");
		let hailSize = weatherParams.maxHailSize || ["N/A"];
		let windSpeed = weatherParams.maxWindGust || ["N/A"];
		let tornadoPossible = weatherParams.tornadoDetection || ["N/A"];
		let hailSource = weatherParams.hailThreat || ["Radar Indicated"];
		let windSource = weatherParams.windThreat || ["Radar Indicated"];
		let torSeverity = weatherParams.tornadoDamageThreat || [""];
		let stormSeverity = weatherParams.thunderstormDamageThreat || [""];
		if (typeof hailSource == Array) hailSource = hailSource[0];
		if (typeof windSource == Array) windSource = windSource[0];

		let params = {
			event: weatherEvent,
			expires: feature.properties.expires,
			isDefault: false,
			description: feature.properties.description,
			parameters: {
				hail: {
					maxHail: hailSize[0],
					radarIndicated: hailSource[0].toTitleCase(),
				},
				wind: {
					windSpeed: windSpeed[0],
					radarIndicated: windSource[0].toTitleCase(),
				},
				tornado: {
					possible: tornadoPossible[0].toTitleCase(),
					severity: torSeverity[0].toTitleCase(),
				},
				storm: { severity: stormSeverity[0].toTitleCase() },
				damageThreat: "",
				origionalFeature: feature,
			},
		};

		// In case no hail or is 0.00"
		if (params.parameters.hail.maxHail == "0.00") {
			params.parameters.hail.maxHail = "N/A";
		}

		// In case no wind or is 0mph
		if (params.parameters.wind.windSpeed == "0mph") {
			params.parameters.wind.windSpeed = "N/A";
		}

		// In case hail has bugged with SWS
		if (
			!params.parameters.hail.maxHail.includes('"') &&
			params.parameters.hail.maxHail != "N/A"
		) {
			params.parameters.hail.maxHail += '"';
		}

		return params;
	} catch (e) {
		console.error(e);
		return {
			event: "Error",
			expires: "N/A",
			description: "An error occurred while parsing the storm data.",
			isDefault: false,
			parameters: {
				hail: { maxHail: "N/A", radarIndicated: "Radar Indicated" },
				wind: { windSpeed: "N/A", radarIndicated: "Radar Indicated" },
				tornado: { possible: "N/A", severity: "" },
				storm: { severity: "" },
				origionalFeature: feature,
			},
		};
	}
}

function getDefaults(feature) {
	let params = {
		event: feature.properties.event,
		expires: feature.properties.expires,
		description: feature.properties.description,
		isDefault: true,
		origionalFeature: feature,
	};
	return params;
}

function asText(json) {
	let weatherEvent = json.event;
	let expireTime = json.expires;
	let popupContent = `
	  <strong>${weatherEvent}</strong><br>
	  Expires: ${formatExpirationTime(expireTime)}<br>
  `;

	const hail = json.parameters.hail.maxHail || "N/A";
	const wind = json.parameters.wind.windSpeed || "N/A";
	let windSource = json.parameters.wind.radarIndicated || "Radar Indicated";
	let hailSource = json.parameters.hail.radarIndicated || "Radar Indicated";
	const tornado = json.parameters.tornado.possible || "N/A";
	const torSeverity = json.parameters.tornado.severity || "";
	const stormSeverity = json.parameters.storm.severity || "";

	if (weatherEvent.includes("Special Weather Statement")) {
		windSource = hailSource = "Radar Indicated";
	}

	if (!json.description.includes("weakened below severe")) {
		if (hail.toUpperCase() != "N/A") {
			popupContent += `Hail: ${hail}, ${hailSource}<br>`;
		}
		if (wind.toUpperCase() != "N/A") {
			popupContent += `Wind: ${wind}, ${windSource}<br>`;
		}
		if (tornado.toUpperCase() != "N/A") {
			popupContent += `Tornado: ${tornado}<br>`;
		}
		if (torSeverity != "") {
			popupContent += `Threat: ${torSeverity}<br>`;
		}
		if (stormSeverity != "" && torSeverity == "") {
			popupContent += `Threat: ${stormSeverity}<br>`;
		}
	} else {
		popupContent += `This storm has weakened below severe limits.\nThis warning will expire soon.\n<br>`;
	}

	return popupContent;
}

function forceUpdate() {
	window.timeUntilNextUpdate = 1;
}

function dev(preset) {
	if (!preset) preset = "";
	if (typeof preset !== "number") preset = preset.toLowerCase();
	switch (preset) {
		case "disable":
		case "reset":
		case "":
			config.dev = config.devPresets["0"];
			break;

		default:
			config.dev = config.devPresets[`${preset}`];
			break;
	}
	window.timeUntilNextUpdate = 1;
}

function isPointInPolygon(lat, lng, polygon) {
	let inside = false;

	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const xi = polygon[i][0]; // lng
		const yi = polygon[i][1]; // lat
		const xj = polygon[j][0]; // lng
		const yj = polygon[j][1]; // lat

		const intersect =
			yi > lat !== yj > lat &&
			lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

		if (intersect) inside = !inside;
	}

	return inside;
}

window.mapHitStackItems = window.mapHitStackItems || [];
window.mapHitStackState = window.mapHitStackState || null;
let mapHitStackOrder = 0;

function registerMapHitStackLayer(layer, options) {
	if (!layer || typeof window === "undefined") return;
	options = options || {};
	unregisterMapHitStackLayer(layer);

	const item = {
		layer,
		groupId: options.groupId || "",
		kind: options.kind || "Layer",
		label: options.label || getMapHitStackLayerLabel(layer),
		order: ++mapHitStackOrder,
	};

	window.mapHitStackItems.push(item);
	layer.on("click", function (event) {
		openMapHitStackAt(event.latlng, event.originalEvent);
	});
}

function unregisterMapHitStackLayer(layer) {
	if (!layer || typeof window === "undefined" || !Array.isArray(window.mapHitStackItems)) return;

	if (typeof layer.eachLayer === "function") {
		layer.eachLayer((childLayer) => unregisterMapHitStackLayer(childLayer));
	}
	window.mapHitStackItems = window.mapHitStackItems.filter((item) => item.layer !== layer);
}

function refreshMapHitStackOrderForLayer(layer) {
	if (!layer || typeof window === "undefined" || !Array.isArray(window.mapHitStackItems)) return;
	if (typeof layer.eachLayer === "function") {
		layer.eachLayer((childLayer) => refreshMapHitStackOrderForLayer(childLayer));
	}
	const item = window.mapHitStackItems.find((entry) => entry.layer === layer);
	if (item) item.order = ++mapHitStackOrder;
}

function getMapHitStackLayerLabel(layer) {
	const props = layer?.feature?.properties || {};
	return props.newName || props.event || props.title || props.name || "Map Layer";
}

function getMapHitStackPaneZIndex(layer) {
	const paneName = layer?.options?.pane;
	const pane = (paneName && map.getPane(paneName)) || layer?._pane;
	const zIndex = pane ? parseInt(pane.style.zIndex || window.getComputedStyle(pane).zIndex, 10) : 0;
	return Number.isFinite(zIndex) ? zIndex : 0;
}

function isMapHitStackLayerVisible(layer) {
	try {
		if (!layer || !map || !map.hasLayer(layer)) return false;
	} catch (e) {
		return false;
	}
	return !!(layer.getPopup && layer.getPopup());
}

function mapPointFromCoord(coord) {
	if (!Array.isArray(coord) || coord.length < 2) return null;
	return map.latLngToLayerPoint(L.latLng(coord[1], coord[0]));
}

function distanceToSegment(point, start, end) {
	if (!point || !start || !end) return Infinity;
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	if (dx === 0 && dy === 0) return point.distanceTo(start);
	const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
	return point.distanceTo(L.point(start.x + t * dx, start.y + t * dy));
}

function isPointNearLine(latlng, coordinates, tolerancePx) {
	if (!Array.isArray(coordinates) || coordinates.length < 2) return false;
	const clickPoint = map.latLngToLayerPoint(latlng);
	for (let i = 0; i < coordinates.length - 1; i++) {
		if (distanceToSegment(clickPoint, mapPointFromCoord(coordinates[i]), mapPointFromCoord(coordinates[i + 1])) <= tolerancePx) {
			return true;
		}
	}
	return false;
}

function isLatLngInPolygonGeometry(latlng, coordinates) {
	if (!Array.isArray(coordinates) || coordinates.length === 0) return false;
	if (!isPointInPolygon(latlng.lat, latlng.lng, coordinates[0])) return false;

	for (let i = 1; i < coordinates.length; i++) {
		if (isPointInPolygon(latlng.lat, latlng.lng, coordinates[i])) return false;
	}
	return true;
}

function getPointHitTolerance(layer) {
	const props = layer?.feature?.properties || {};
	if (props.iconElements && props.iconElements.length) {
		return Math.max(18, ...props.iconElements.map((el) => Math.max(el.width || 0, el.height || 0) / 2 + Math.abs(el.xOff || 0) + Math.abs(el.yOff || 0)));
	}
	if (props["marker-type"] === "text") return Math.max(24, String(props.name || "").length * 4);
	if (layer && typeof layer.getRadius === "function") return layer.getRadius() + 8;
	return 18;
}

function doesMapHitStackItemContainLatLng(item, latlng) {
	const layer = item.layer;
	if (!isMapHitStackLayerVisible(layer)) return false;

	if (layer.getLatLng && !layer.feature?.geometry) {
		const point = map.latLngToLayerPoint(latlng);
		const markerPoint = map.latLngToLayerPoint(layer.getLatLng());
		return point.distanceTo(markerPoint) <= getPointHitTolerance(layer);
	}

	const geometry = layer.feature && layer.feature.geometry;
	if (!geometry || !geometry.coordinates) return false;
	const type = geometry.type;
	const tolerance = Math.max(8, ((layer.options && layer.options.weight) || 2) + 6);

	if (type === "Point") {
		const featurePoint = mapPointFromCoord(geometry.coordinates);
		return featurePoint && map.latLngToLayerPoint(latlng).distanceTo(featurePoint) <= getPointHitTolerance(layer);
	}
	if (type === "MultiPoint") {
		return geometry.coordinates.some((coord) => {
			const featurePoint = mapPointFromCoord(coord);
			return featurePoint && map.latLngToLayerPoint(latlng).distanceTo(featurePoint) <= getPointHitTolerance(layer);
		});
	}
	if (type === "LineString") return isPointNearLine(latlng, geometry.coordinates, tolerance);
	if (type === "MultiLineString") return geometry.coordinates.some((line) => isPointNearLine(latlng, line, tolerance));
	if (type === "Polygon") return isLatLngInPolygonGeometry(latlng, geometry.coordinates);
	if (type === "MultiPolygon") return geometry.coordinates.some((polygon) => isLatLngInPolygonGeometry(latlng, polygon));

	return false;
}

function collectMapHitStackItems(latlng) {
	if (!Array.isArray(window.mapHitStackItems)) return [];

	window.mapHitStackItems = window.mapHitStackItems.filter((item) => isMapHitStackLayerVisible(item.layer));
	const seen = new Set();
	return window.mapHitStackItems
		.filter((item) => {
			if (!doesMapHitStackItemContainLatLng(item, latlng)) return false;
			const stamp = L.stamp(item.layer);
			if (seen.has(stamp)) return false;
			seen.add(stamp);
			return true;
		})
		.sort((a, b) => {
			const paneDiff = getMapHitStackPaneZIndex(b.layer) - getMapHitStackPaneZIndex(a.layer);
			return paneDiff || b.order - a.order;
		});
}

function getOrCreateMapHitStackControl() {
	let control = document.getElementById("map-hit-stack-control");
	if (control) return control;

	control = document.createElement("div");
	control.id = "map-hit-stack-control";
	control.innerHTML = `
		<button class="map-hit-stack-btn" data-stack-action="prev" title="Previous overlapping item" aria-label="Previous overlapping item">
			<i class="fas fa-chevron-left"></i>
		</button>
		<button class="map-hit-stack-main" data-stack-action="next" title="Next overlapping item" aria-label="Next overlapping item">
			<span class="map-hit-stack-title"></span>
			<span class="map-hit-stack-count"></span>
		</button>
		<button class="map-hit-stack-btn" data-stack-action="next" title="Next overlapping item" aria-label="Next overlapping item">
			<i class="fas fa-chevron-right"></i>
		</button>
		<button class="map-hit-stack-close" data-stack-action="close" title="Close selector" aria-label="Close selector">
			<i class="fas fa-times"></i>
		</button>`;

	control.addEventListener("click", (event) => {
		const button = event.target.closest("[data-stack-action]");
		if (!button) return;
		event.preventDefault();
		event.stopPropagation();
		const action = button.dataset.stackAction;
		if (action === "close") {
			hideMapHitStackControl(true);
		} else if (action === "prev") {
			cycleMapHitStack(-1);
		} else {
			cycleMapHitStack(1);
		}
	});

	let swipeStartX = null;
	control.addEventListener("pointerdown", (event) => {
		swipeStartX = event.clientX;
	});
	control.addEventListener("pointerup", (event) => {
		if (swipeStartX === null) return;
		const deltaX = event.clientX - swipeStartX;
		swipeStartX = null;
		if (Math.abs(deltaX) < 36) return;
		cycleMapHitStack(deltaX < 0 ? 1 : -1);
	});
	control.addEventListener("wheel", (event) => {
		if (!window.mapHitStackState) return;
		event.preventDefault();
		event.stopPropagation();
		const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
		if (Math.abs(delta) < 1) return;
		cycleMapHitStack(delta > 0 ? 1 : -1);
	}, { passive: false });

	document.body.appendChild(control);
	return control;
}

function renderMapHitStackControl() {
	const state = window.mapHitStackState;
	const control = getOrCreateMapHitStackControl();
	if (!state || state.items.length <= 1) {
		control.style.display = "none";
		return;
	}

	const item = state.items[state.index];
	control.querySelector(".map-hit-stack-title").textContent = `${item.kind}: ${item.label || getMapHitStackLayerLabel(item.layer)}`;
	control.querySelector(".map-hit-stack-count").textContent = `${state.index + 1} / ${state.items.length}`;
	control.style.display = "flex";
}

function openMapHitStackItem(index) {
	const state = window.mapHitStackState;
	if (!state || state.items.length === 0) return;
	state.index = (index + state.items.length) % state.items.length;
	const item = state.items[state.index];
	window.mapHitStackCurrentLayer = item.layer;

	try {
		if (item.layer.getPopup && item.layer.getPopup()) {
			window.mapHitStackSuppressPopupCloseUntil = Date.now() + 350;
			item.layer.openPopup(state.latlng);
			setTimeout(() => {
				if (Date.now() >= (window.mapHitStackSuppressPopupCloseUntil || 0)) {
					window.mapHitStackSuppressPopupCloseUntil = 0;
				}
			}, 400);
		}
	} catch (e) {
		window.mapHitStackSuppressPopupCloseUntil = 0;
		console.warn("Unable to open stacked map popup:", e);
	}
	renderMapHitStackControl();
}

function cycleMapHitStack(delta) {
	const state = window.mapHitStackState;
	if (!state) return;
	openMapHitStackItem(state.index + delta);
}

function hideMapHitStackControl(closePopup) {
	window.mapHitStackState = null;
	window.mapHitStackCurrentLayer = null;
	const control = document.getElementById("map-hit-stack-control");
	if (control) control.style.display = "none";
	if (closePopup) {
		try { map.closePopup(); } catch (e) { }
	}
}

function openMapHitStackAt(latlng, originalEvent) {
	if (!latlng) return false;
	const items = collectMapHitStackItems(latlng);
	if (items.length === 0) {
		hideMapHitStackControl();
		return false;
	}

	if (originalEvent && typeof L !== "undefined" && L.DomEvent) {
		L.DomEvent.stop(originalEvent);
	}

	window.mapHitStackState = {
		items,
		index: 0,
		latlng,
	};
	openMapHitStackItem(0);
	return true;
}

function initMapHitStack() {
	if (typeof map === "undefined" || !map || window.mapHitStackInitialized) return;
	window.mapHitStackInitialized = true;

	map.on("click", (event) => {
		const clickTarget = event && event.originalEvent ? event.originalEvent.target : null;
		if (clickTarget && typeof clickTarget.closest === "function" && clickTarget.closest(".leaflet-popup-pane, #map-hit-stack-control")) {
			return;
		}
		openMapHitStackAt(event.latlng, event.originalEvent);
	});
	map.on("movestart zoomstart", () => hideMapHitStackControl());
	map.on("popupclose", (event) => {
		const closedSource = event?.popup?._source || event?.layer;
		if (window.mapHitStackState && closedSource && closedSource !== window.mapHitStackCurrentLayer) return;
		if (Date.now() < (window.mapHitStackSuppressPopupCloseUntil || 0)) return;
		hideMapHitStackControl();
	});
	document.addEventListener("keydown", (event) => {
		if (!window.mapHitStackState) return;
		if (event.key === "Escape") hideMapHitStackControl();
		if (event.key === "ArrowLeft") cycleMapHitStack(-1);
		if (event.key === "ArrowRight") cycleMapHitStack(1);
	});
}

document.addEventListener("mapLoaded", initMapHitStack);

// Queue for TTS messages
window.ttsQueue = window.ttsQueue || [];
window.isSpeaking = window.isSpeaking || false;

// Cache of alerts already spoken: Set of "markerName|alertId" strings
window.spokenAlerts = window.spokenAlerts || new Set();

// Track whether the user has interacted with the page (required by Chrome autoplay policy)
window.userHasInteracted = window.userHasInteracted || false;
(function () {
	if (window.userHasInteracted) return;
	const events = ["click", "touchstart", "keydown"];
	function onInteract() {
		window.userHasInteracted = true;
		events.forEach((e) => document.removeEventListener(e, onInteract, true));
		// Process any queued messages that were waiting for interaction
		if (window.ttsQueue.length > 0) {
			_processTTSQueue();
		}
	}
	events.forEach((e) => document.addEventListener(e, onInteract, true));
})();

/**
 * Process the TTS message queue — speaks queued messages one at a time.
 * Called after audio ends or when the user first interacts with the page.
 */
function _processTTSQueue() {
	if (window.isSpeaking || window.ttsQueue.length === 0) return;

	window.isSpeaking = true;
	const msg = window.ttsQueue.shift();

	const utterance = new SpeechSynthesisUtterance(msg);
	utterance.rate = 1;
	utterance.pitch = 1;
	utterance.volume = 1;

	utterance.onend = () => {
		window.isSpeaking = false;
		_processTTSQueue();
	};

	utterance.onerror = () => {
		window.isSpeaking = false;
		_processTTSQueue();
	};

	speechSynthesis.speak(utterance);
}

function showNotification(prefix, alertName, color, duration = 5000) {
	const container = document.getElementById("notification-container");
	if (!container) return;

	const toast = document.createElement("div");
	toast.className = "notification-toast";
	if (color) toast.style.setProperty("--toast-color", color);

	const msg = document.createElement("span");
	msg.textContent = prefix;

	const coloredPart = document.createElement("span");
	coloredPart.textContent = alertName;
	if (color) coloredPart.style.color = color;

	const closeBtn = document.createElement("button");
	closeBtn.className = "notification-toast-close";
	closeBtn.innerHTML = "&#x2715;";
	closeBtn.onclick = () => dismissToast(toast);

	toast.appendChild(msg);
	toast.appendChild(coloredPart);
	toast.appendChild(closeBtn);
	container.appendChild(toast);

	setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
	if (toast.classList.contains("toast-out")) return;
	toast.classList.add("toast-out");
	toast.addEventListener("transitionend", () => toast.remove());
}

function playSound(markerName, textToSpeak) {
	// Check if alert sound is enabled
	if (!config.alertSound) return;

	// Check if speech synthesis is supported
	if (!("speechSynthesis" in window)) {
		console.warn("Text-to-Speech not supported in this browser");
		return;
	}

	let output = (textToSpeak.replace("N/a", "")).trim();

	// Queue the message
	console.log(output);
	const message = `${markerName} is in a ${output}`;
	showNotification(`${markerName} is in a `, output, getColor(output));
	window.ttsQueue.push(message);

	// (Chrome autoplay policy)
	if (!window.userHasInteracted) {
		console.info("Queued TTS — waiting for user interaction before playback.");
		return;
	}

	// Play the EAS end tone audio file, then process the TTS queue
	const audio = new Audio("./audio/eas_end_tone.mp4");
	audio.volume = 0.3;
	audio.play().catch((e) => console.warn("Audio playback failed:", e));

	audio.onended = () => _processTTSQueue();
}

window.placefileLayers = window.placefileLayers || {};
const PLACEFILE_PROXY_BASE = "https://data.arch1010.dev/proxy?url=";

function isPrivateNetworkUrl(url, baseUrl) {
	try {
		const parsed = new URL(url, baseUrl || (typeof window !== "undefined" ? window.location.href : undefined));
		const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
		if (host === "localhost" || host === "::1") return true;
		if (/^127\./.test(host) || /^169\.254\./.test(host)) return true;
		if (/^10\./.test(host) || /^192\.168\./.test(host)) return true;
		const match = host.match(/^172\.(\d+)\./);
		return !!match && Number(match[1]) >= 16 && Number(match[1]) <= 31;
	} catch (e) {
		return false;
	}
}

function parseGRLevelXPlacefile(text, sourceUrl, options) {
	const features = [];
	const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
	const parseOptions = options || {};
	const promoteClosedLineRingsToPolygons = parseOptions.promoteClosedLineRingsToPolygons === true;
	const baseUrl = (() => {
		if (typeof sourceUrl !== "string") return null;
		const trimmed = sourceUrl.trim();
		if (!trimmed) return null;
		if (/^https?:\/\//i.test(trimmed)) return trimmed;
		if (/^\/\//.test(trimmed)) return "https:" + trimmed;
		return null;
	})();

	let currentColor = [255, 255, 255, 255];
	let currentFont = { size: 12, name: "Arial" };
	let refreshSeconds = null;
	let title = "";

	// State for multi-line commands
	let mode = null;          // "line", "polygon", "triangles", "object"
	let coords = [];
	let cmdMeta = {};         // label, width, etc. from the command header
	let objectIcons = [];     // collected icons inside Object: ... End:
	const iconFiles = {};

	function rgbaToHex(r, g, b, a) {
		const hex = "#" + [r, g, b].map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("");
		return hex;
	}

	function currentOpacity() {
		return currentColor[3] / 255;
	}

	function colorOpacity(color) {
		return color[3] / 255;
	}

	function parseLabelParts(rawLabel) {
		if (!rawLabel) return { title: "", description: "" };
		// Unescape \n sequences
		const unescaped = rawLabel.replace(/\\n/g, "\n");
		const splitIndex = unescaped.indexOf("\n\n");
		if (splitIndex === -1) {
			return { title: unescaped.trim(), description: "" };
		}
		return {
			title: unescaped.slice(0, splitIndex).trim(),
			description: unescaped.slice(splitIndex + 2).trim(),
		};
	}

	function isValidLatLon(lat, lon) {
		return Number.isFinite(lat) && Number.isFinite(lon) &&
			lat >= -90 && lat <= 90 &&
			lon >= -180 && lon <= 180;
	}

	function parseRgbaFields(fields) {
		if (fields.length !== 3 && fields.length !== 4) return null;
		const rgba = fields.map(Number);
		if (!rgba.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) return null;
		return [rgba[0], rgba[1], rgba[2], rgba.length === 4 ? rgba[3] : 255];
	}

	function parseCoordLine(line, coords) {
		const numberMatches = line.match(/-?(?:\d+(?:\.\d*)?|\.\d+)/g);
		if (!numberMatches || numberMatches.length < 2) return;

		const values = numberMatches.map(Number);
		const lat = values[0];
		const lon = values[1];
		const inlineColor = parseRgbaFields(values.slice(2));

		if (inlineColor && isValidLatLon(lat, lon)) {
			const hasOddFieldCount = values.length % 2 !== 0;
			let hasInvalidTrailingPair = false;
			for (let i = 2; i + 1 < values.length; i += 2) {
				if (!isValidLatLon(values[i], values[i + 1])) {
					hasInvalidTrailingPair = true;
					break;
				}
			}
			if (hasOddFieldCount || hasInvalidTrailingPair) {
				coords.push([lat, lon]);
				if (!cmdMeta.inlineColor) cmdMeta.inlineColor = inlineColor;
				return;
			}
		}

		for (let i = 0; i + 1 < values.length; i += 2) {
			const pairLat = values[i];
			const pairLon = values[i + 1];
			if (isValidLatLon(pairLat, pairLon)) {
				coords.push([pairLat, pairLon]);
			}
		}
	}

	function normalizeIconFilename(filename) {
		let value = String(filename || "").trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1).trim();
		}
		return value;
	}

	function buildSpriteIconElement(fileIdx, iconIdx, xOff, yOff, rotation, tooltip) {
		const iconDef = iconFiles[fileIdx];
		if (!iconDef) return null;
		const maxIcons = Math.max(1, iconDef.columns * iconDef.rows);
		const oneBasedIndex = Number.isFinite(iconIdx) ? Math.floor(iconIdx) : 1;
		const spriteIndex = Math.max(0, Math.min(maxIcons - 1, oneBasedIndex - 1));
		const col = spriteIndex % iconDef.columns;
		const row = Math.floor(spriteIndex / iconDef.columns);
		const normalizedTooltip = String(tooltip || "").replace(/\\n/g, "\n");
		return {
			type: "icon",
			xOff, yOff, rotation,
			width: iconDef.width,
			height: iconDef.height,
			spriteX: col * iconDef.width,
			spriteY: row * iconDef.height,
			url: iconDef.url,
			tooltip: normalizedTooltip,
		};
	}

	function flushMultiLine() {
		if (!mode) return;

		const commandColor = cmdMeta.inlineColor || currentColor;
		const commandOpacity = colorOpacity(commandColor);

		if (mode === "line" && coords.length >= 2) {
			const labelParts = parseLabelParts(cmdMeta.label);
			const isClosedRing = coords.length >= 4 && (() => {
				const first = coords[0];
				const last = coords[coords.length - 1];
				return first[0] === last[0] && first[1] === last[1];
			})();

			if (promoteClosedLineRingsToPolygons && isClosedRing) {
				const ring = coords.map(c => [c[1], c[0]]);
				features.push({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [ring] },
					properties: {
						stroke: rgbaToHex(...commandColor),
						"stroke-width": cmdMeta.width || 2,
						"stroke-opacity": commandOpacity,
						fill: rgbaToHex(...commandColor),
						"fill-opacity": Math.max(commandOpacity * 0.15, 0.02),
						name: cmdMeta.label || "",
						title: labelParts.title,
						description: labelParts.description,
						placefileCommand: "polygon",
						sourceCommand: "line",
					},
				});
			} else {
				features.push({
					type: "Feature",
					geometry: { type: "LineString", coordinates: coords.map(c => [c[1], c[0]]) },
					properties: {
						stroke: rgbaToHex(...commandColor),
						"stroke-width": cmdMeta.width || 2,
						"stroke-opacity": commandOpacity,
						name: cmdMeta.label || "",
						title: labelParts.title,
						description: labelParts.description,
						placefileCommand: "line",
					},
				});
			}
		} else if (mode === "polygon" && coords.length >= 3) {
			const ring = coords.map(c => [c[1], c[0]]);
			if (ring.length > 0) ring.push(ring[0]); // close ring
			const labelParts = parseLabelParts(cmdMeta.label);
			const fillOpacity = cmdMeta.inlineColor ? commandOpacity : commandOpacity * 0.3;
			features.push({
				type: "Feature",
				geometry: { type: "Polygon", coordinates: [ring] },
				properties: {
					stroke: rgbaToHex(...commandColor),
					"stroke-width": cmdMeta.width || 2,
					"stroke-opacity": commandOpacity,
					fill: rgbaToHex(...commandColor),
					"fill-opacity": fillOpacity,
					name: cmdMeta.label || "",
					title: labelParts.title,
					description: labelParts.description,
					placefileCommand: "polygon",
				},
			});
		} else if (mode === "triangles" && coords.length >= 3) {
			// Render triangles as polygons in groups of 3 vertices
			for (let i = 0; i + 2 < coords.length; i += 3) {
				const tri = [coords[i], coords[i + 1], coords[i + 2], coords[i]].map(c => [c[1], c[0]]);
				features.push({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [tri] },
					properties: {
						stroke: rgbaToHex(...commandColor),
						"stroke-width": 1,
						"stroke-opacity": commandOpacity,
						fill: rgbaToHex(...commandColor),
						"fill-opacity": commandOpacity * 0.5,
						placefileCommand: "triangles",
					},
				});
			}
		} else if (mode === "object") {
			// Object icons are already pushed individually
		}

		mode = null;
		coords = [];
		cmdMeta = {};
	}

	for (let i = 0; i < lines.length; i++) {
		const raw = lines[i];
		const trimmed = raw.trim();

		// Skip blank lines and comments
		if (!trimmed || trimmed.startsWith(";")) continue;

		// End: terminates multi-line blocks
		if (/^End:/i.test(trimmed)) {
			flushMultiLine();
			continue;
		}

		if (mode === "line" || mode === "polygon" || mode === "triangles") {
			// Coordinate lines: lat, lon  or  lat, lon, lat, lon, ...
			// May also have inline Color: changes
			if (/^Color:/i.test(trimmed)) {
				// Color change mid-block
				const parts = trimmed.replace(/^Color:\s*/i, "").trim().split(/[\s,]+/).map(Number);
				if (parts.length >= 3) {
					currentColor = [parts[0], parts[1], parts[2], parts.length >= 4 ? parts[3] : 255];
				}
				continue;
			}

			parseCoordLine(trimmed, coords);
			continue;
		}

		if (mode === "object") {
			const iconMatch = trimmed.match(/^Icon:\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*(?:,\s*"([^"]*)")?/i);
			if (iconMatch) {
				const xOff = parseFloat(iconMatch[1]);
				const yOff = parseFloat(iconMatch[2]);
				const rotation = parseFloat(iconMatch[3]);
				const fileIdx = parseInt(iconMatch[4], 10);
				const iconIdx = parseInt(iconMatch[5], 10);
				const tooltip = iconMatch[6] || "";
				if (tooltip) {
					objectElements.push({ type: "icon-tooltip", tooltip });
				}
				const iconEl = buildSpriteIconElement(fileIdx, iconIdx, xOff, yOff, rotation, tooltip);
				if (iconEl) objectElements.push(iconEl);
			}
			continue;
		}

		if (/^Title:\s*/i.test(trimmed)) {
			title = trimmed.replace(/^Title:\s*/i, "").trim();
			continue;
		}

		if (/^Icon:\s*/i.test(trimmed)) {
			const iconMatch = trimmed.match(/^Icon:\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*(?:,\s*"([^"]*)")?/i);
			if (iconMatch) {
				const lat = parseFloat(iconMatch[1]);
				const lon = parseFloat(iconMatch[2]);
				const rotation = parseFloat(iconMatch[3]);
				const fileIdx = parseInt(iconMatch[4], 10);
				const iconIdx = parseInt(iconMatch[5], 10);
				const tooltip = String(iconMatch[6] || "").replace(/\\n/g, "\n");
				const iconEl = buildSpriteIconElement(fileIdx, iconIdx, 0, 0, rotation, tooltip);
				if (!isNaN(lat) && !isNaN(lon) && iconEl) {
					const tooltipLines = tooltip ? tooltip.split("\n") : [];
					const firstLine = tooltipLines[0] || "";
					const remainingLines = tooltipLines.length > 1 ? tooltipLines.slice(1).join("\n") : "";
					features.push({
						type: "Feature",
						geometry: { type: "Point", coordinates: [lon, lat] },
						properties: {
							"marker-type": "icon",
							iconElements: [iconEl],
							title: firstLine,
							description: remainingLines,
							name: firstLine,
							popupButtonText: tooltip ? "Show Full Text" : undefined,
						},
					});
				}
			}
			continue;
		}

		if (/^Refresh:\s*/i.test(trimmed)) {
			const val = parseInt(trimmed.replace(/^Refresh:\s*/i, ""), 10);
			if (!isNaN(val) && val > 0) refreshSeconds = val * 60;
			continue;
		}

		if (/^RefreshSeconds:\s*/i.test(trimmed)) {
			const val = parseInt(trimmed.replace(/^RefreshSeconds:\s*/i, ""), 10);
			if (!isNaN(val) && val > 0) refreshSeconds = val;
			continue;
		}

		if (/^Color:\s*/i.test(trimmed)) {
			const parts = trimmed.replace(/^Color:\s*/i, "").trim().split(/[\s,]+/).map(Number);
			if (parts.length >= 3) {
				currentColor = [parts[0], parts[1], parts[2], parts.length >= 4 ? parts[3] : 255];
			}
			continue;
		}

		if (/^Font:\s*/i.test(trimmed)) {
			const fontMatch = trimmed.match(/^Font:\s*\d+\s*,\s*(\d+)\s*,\s*\d+\s*,\s*"([^"]*)"/i);
			if (fontMatch) {
				currentFont = { size: parseInt(fontMatch[1], 10), name: fontMatch[2] };
			}
			continue;
		}
		if (/^TimeRange:/i.test(trimmed) || /^Threshold:/i.test(trimmed)) {
			continue;
		}

		// IconFile: fileIndex, iconWidth, iconHeight, numColumns, numRows, filename
		if (/^IconFile:\s*/i.test(trimmed)) {
			const ifMatch = trimmed.match(/^IconFile:\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(.+)$/i);
			if (ifMatch) {
				const fileIndex = parseInt(ifMatch[1], 10);
				const iconW = parseInt(ifMatch[2], 10);
				const iconH = parseInt(ifMatch[3], 10);
				let numCols = parseInt(ifMatch[4], 10);
				let numRows = parseInt(ifMatch[5], 10);
				const filename = normalizeIconFilename(ifMatch[6]);

				// Generalized icon sheet grid normalization for known exceptions
				// Map of known icon sheet URLs (or patterns) to their correct grid sizes
				const iconSheetGridOverrides = [
					{
						pattern: /spotternetwork\.org\/iconsheets\/SN_Reports_096\.png/i,
						cols: 3,
						rows: 4
					},
					// Add more overrides here as needed:
					// { pattern: /someother\.org\/iconsheet\.png/i, cols: X, rows: Y }
				];
				for (const override of iconSheetGridOverrides) {
					if (override.pattern.test(filename)) {
						numCols = override.cols;
						numRows = override.rows;
						break;
					}
				}
				// Resolve relative URL against placefile base
				let imgUrl = filename;
				const isAbsolute = /^(https?:)?\/\//i.test(filename) || /^data:/i.test(filename) || /^blob:/i.test(filename);
				if (baseUrl && !isAbsolute) {
					try {
						imgUrl = new URL(filename, baseUrl).href;
					} catch (e) {
						const base = baseUrl.replace(/\/[^/]*$/, "/");
						imgUrl = base + filename;
					}
				} else if (/^\/\//.test(filename)) {
					imgUrl = "https:" + filename;
				}
				const iconUrl = isPrivateNetworkUrl(imgUrl, baseUrl) ? imgUrl : PLACEFILE_PROXY_BASE + encodeURIComponent(imgUrl);
				iconFiles[fileIndex] = { width: iconW, height: iconH, columns: numCols, rows: numRows, url: iconUrl };
			}
			continue;
		}

		const lineMatch = trimmed.match(/^Line:\s*([-\d.]+)\s*,\s*([-\d.]+)\s*(?:,\s*"([^"]*)")?/i);
		if (lineMatch) {
			flushMultiLine();
			mode = "line";
			coords = [];
			cmdMeta = { width: parseFloat(lineMatch[1]) || 2, label: lineMatch[3] || "" };
			// Check for trailing coordinate after the closing quote
			const afterLabel = trimmed.replace(/^Line:\s*[-\d.]+\s*,\s*[-\d.]+\s*(?:,\s*"[^"]*")?\s*/i, "");
			if (afterLabel) parseCoordLine(afterLabel, coords);
			continue;
		}

		if (/^Polygon:\s*/i.test(trimmed)) {
			flushMultiLine();
			mode = "polygon";
			coords = [];
			const polyLabel = trimmed.match(/"([^"]*)"/);
			cmdMeta = { label: polyLabel ? polyLabel[1] : "" };
			// Check for trailing coordinate after the closing quote
			const afterPolyLabel = trimmed.replace(/^Polygon:\s*(?:"[^"]*")?\s*/i, "");
			if (afterPolyLabel) parseCoordLine(afterPolyLabel, coords);
			continue;
		}

		if (/^Object:\s*/i.test(trimmed)) {
			flushMultiLine();
			mode = "object";
			cmdMeta = {};
			continue;
		}

		const placeMatch = trimmed.match(/^Place:\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*"([^"]*)"/i);
		if (placeMatch) {
			const lat = parseFloat(placeMatch[1]);
			const lon = parseFloat(placeMatch[2]);
			const label = placeMatch[3];
			if (!isNaN(lat) && !isNaN(lon)) {
				features.push({
					type: "Feature",
					geometry: { type: "Point", coordinates: [lon, lat] },
					properties: {
						name: label,
						color: rgbaToHex(...currentColor),
						"marker-type": "place",
					},
				});
			}
			continue;
		}

		const textMatch = trimmed.match(/^Text:\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*\d+\s*,\s*"([^"]*)"(?:\s*,\s*"([^"]*)")?/i);
		if (textMatch) {
			const lat = parseFloat(textMatch[1]);
			const lon = parseFloat(textMatch[2]);
			const label = textMatch[3];
			const rawDesc = textMatch[4];
			const unescapedDesc = rawDesc ? rawDesc.replace(/\\n/g, "\n") : "";
			const descLines = unescapedDesc ? unescapedDesc.split("\n") : [];
			if (!isNaN(lat) && !isNaN(lon)) {
				features.push({
					type: "Feature",
					geometry: { type: "Point", coordinates: [lon, lat] },
					properties: {
						name: label,
						title: descLines.length > 0 ? descLines[0] : label,
						description: descLines.length > 1 ? descLines.slice(1).join("\n") : "",
						color: rgbaToHex(...currentColor),
						fontSize: currentFont.size,
						fontName: currentFont.name,
						"marker-type": "text",
						popupButtonText: rawDesc ? "Show Full Text" : undefined,
					},
				});
			}
			continue;
		}

		const circleMatch = trimmed.match(/^Circle:\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*(?:,\s*"([^"]*)")?/i);
		if (circleMatch) {
			const lat = parseFloat(circleMatch[1]);
			const lon = parseFloat(circleMatch[2]);
			const radiusNm = parseFloat(circleMatch[3]);
			const label = circleMatch[4] || "";
			if (!isNaN(lat) && !isNaN(lon) && !isNaN(radiusNm)) {
				const radiusDeg = radiusNm / 60; // 1 nm ≈ 1/60 degree latitude
				const ring = [];
				for (let a = 0; a <= 360; a += 10) {
					const rad = (a * Math.PI) / 180;
					const cLat = lat + radiusDeg * Math.cos(rad);
					const cLon = lon + (radiusDeg * Math.sin(rad)) / Math.cos((lat * Math.PI) / 180);
					ring.push([cLon, cLat]);
				}
				features.push({
					type: "Feature",
					geometry: { type: "Polygon", coordinates: [ring] },
					properties: {
						stroke: rgbaToHex(...currentColor),
						"stroke-width": 2,
						"stroke-opacity": currentOpacity(),
						fill: rgbaToHex(...currentColor),
						"fill-opacity": currentOpacity() * 0.15,
						name: label,
						placefileCommand: "circle",
					},
				});
			}
			continue;
		}
	}

	flushMultiLine();

	return {
		geojson: { type: "FeatureCollection", features },
		iconFiles,
		refreshSeconds,
		title,
	};
}

// Cache for sprite sheets with black pixels made transparent
const transparentSpriteCache = {};

function makeBlackTransparent(imageUrl) {
	if (transparentSpriteCache[imageUrl]) {
		return Promise.resolve(transparentSpriteCache[imageUrl]);
	}
	// Spotter Network sprite sheets contain black glyphs and labels that would be
	// damaged by black-to-transparent conversion, so keep the original image.
	transparentSpriteCache[imageUrl] = imageUrl;
	return Promise.resolve(imageUrl);
}

async function drawPlacefile(url, text) {
	const existing = window.placefileLayers[url];
	const isMDPlacefile = url === config.mdsUrl;

	// Remove old layer if it exists
	if (existing && existing.layer) {
		unregisterMapHitStackLayer(existing.layer);
		try { map.removeLayer(existing.layer); } catch (e) { }
	}

	const parsed = parseGRLevelXPlacefile(text, url, {
		promoteClosedLineRingsToPolygons: isMDPlacefile,
	});
	const targetPane = isMDPlacefile ? 'mdPane' : 'placefilesPane';
	const markerPane = isMDPlacefile ? 'mdPane' : 'placefileMarkerPane';

	// Process sprite sheets: make black pixels transparent
	const iconFileMap = parsed.iconFiles || {};
	const uniqueUrls = [...new Set(Object.values(iconFileMap).map(function (f) { return f.url; }))];
	const processedUrlMap = {};
	if (uniqueUrls.length > 0) {
		const results = await Promise.all(uniqueUrls.map(function (u) { return makeBlackTransparent(u); }));
		for (var i = 0; i < uniqueUrls.length; i++) {
			processedUrlMap[uniqueUrls[i]] = results[i];
		}
		// Replace URLs in all icon elements within features
		parsed.geojson.features.forEach(function (f) {
			var icons = f.properties && f.properties.iconElements;
			if (icons) {
				icons.forEach(function (el) {
					if (processedUrlMap[el.url]) el.url = processedUrlMap[el.url];
				});
			}
		});
	}

	const geoLayer = L.geoJSON(parsed.geojson, {
		pane: targetPane,
		interactive: true,
		style: function (feature) {
			const fillOpacity = feature.properties["fill-opacity"];
			return {
				color: feature.properties.stroke || feature.properties.color || "#3388ff",
				weight: feature.properties["stroke-width"] || 2,
				opacity: feature.properties["stroke-opacity"] || 1,
				fillColor: feature.properties.fill || feature.properties.color || "#3388ff",
				fill: !isMDPlacefile && !!feature.properties.fill && fillOpacity !== 0,
				fillOpacity: isMDPlacefile ? 0 : (fillOpacity !== undefined ? fillOpacity : 0),
			};
		},
		pointToLayer: function (feature, latlng) {
			const markerType = feature.properties["marker-type"];
			if (markerType === "text") {
				return L.marker(latlng, {
					pane: markerPane,
					interactive: true,
					icon: L.divIcon({
						className: "placefile-text-label",
						html: '<span style="color:' + (feature.properties.color || "#fff") +
							";font-size:" + (feature.properties.fontSize || 12) +
							'px; display: inline-block; transform: translate(-50%, -50%);">' +
							feature.properties.name + "</span>",
						iconSize: [0, 0],
						iconAnchor: [0, 0],
					}),
				});
			}
			if (markerType === "object") {
				const textEls = feature.properties.textElements || [];
				const iconEls = feature.properties.iconElements || [];
				let html = '<div style="position: relative;">';
				for (const el of iconEls) {
					const rotStyle = el.rotation ? ' transform: rotate(' + el.rotation + 'deg);' : '';
					html += '<div style="position: absolute;' +
						' left:' + (el.xOff - el.width / 2) + 'px; top:' + (-(el.yOff) - el.height / 2) + 'px;' +
						' width:' + el.width + 'px; height:' + el.height + 'px;' +
						' background: url(\'' + el.url + '\') no-repeat -' + el.spriteX + 'px -' + el.spriteY + 'px;' +
						rotStyle + '"></div>';
				}
				for (const el of textEls) {
					// GRLevelX text alignment: negative x → right-align (text ends at offset),
					// positive x → left-align (text starts at offset), vertically centered
					const xTranslate = el.xOff < 0 ? '-100%' : '0';
					html += '<span style="position: absolute;' +
						' left:' + el.xOff + 'px; top:' + (-(el.yOff)) + 'px;' +
						' color:' + (el.color || '#fff') + ';' +
						' font-size:' + (el.fontSize || 12) + 'px;' +
						' white-space: nowrap;' +
						' transform: translate(' + xTranslate + ', -50%);">' +
						el.label + '</span>';
				}
				html += '</div>';
				return L.marker(latlng, {
					pane: markerPane,
					interactive: true,
					icon: L.divIcon({
						className: "placefile-text-label",
						html: html,
						iconSize: [0, 0],
						iconAnchor: [0, 0],
					}),
				});
			}
			if (markerType === "icon") {
				const iconEls = feature.properties.iconElements || [];
				let html = '<div style="position: relative;">';
				for (const el of iconEls) {
					const rotStyle = el.rotation ? ' transform: rotate(' + el.rotation + 'deg);' : '';
					html += '<div style="position: absolute;' +
						' left:' + (el.xOff - el.width / 2) + 'px; top:' + (-(el.yOff) - el.height / 2) + 'px;' +
						' width:' + el.width + 'px; height:' + el.height + 'px;' +
						' background: url(\'' + el.url + '\') no-repeat -' + el.spriteX + 'px -' + el.spriteY + 'px;' +
						rotStyle + '"></div>';
				}
				html += '</div>';
				return L.marker(latlng, {
					pane: markerPane,
					interactive: true,
					icon: L.divIcon({
						className: "placefile-icon-label",
						html: html,
						iconSize: [0, 0],
						iconAnchor: [0, 0],
					}),
				});
			}
			return L.circleMarker(latlng, {
				pane: markerPane,
				radius: 6,
				color: feature.properties.color || "#3388ff",
				fillColor: feature.properties.color || "#3388ff",
				fillOpacity: 0.6,
			});
		},
		onEachFeature: function (feature, layer) {
			const props = feature.properties || {};
			const title = props.title || props.name || "";
			const description = props.description || "";
			if (!title && !description) return;

			const fullText = (title + (description ? "\n\n" + description : "")).trim();

			// Try to extract an expiration time from "Valid from ... - <end time>"
			// Matches patterns like "Valid from Sat Mar 7, 2:55pm - 5:00pm CST"
			let expiresHtml = "";
			const validMatch = fullText.match(/Valid\s+from\s+(.+?)\s*-\s*(.+)/i);
			if (validMatch) {
				const fromPart = validMatch[1].trim();
				const toPart = validMatch[2].trim();
				// Try to parse the end time using the date context from the from-part
				// Extract the date portion (e.g. "Sat Mar 7") from the from-part
				const dateMatch = fromPart.match(/^([A-Za-z]+\s+[A-Za-z]+\s+\d+)/);
				const datePart = dateMatch ? dateMatch[1] + ", " : "";
				const endDateStr = datePart + toPart;
				const endDate = new Date(endDateStr);
				if (!isNaN(endDate.getTime())) {
					// If year is missing, assume current year
					if (endDate.getFullYear() === 2001 || endDate.getFullYear() < 2020) {
						endDate.setFullYear(new Date().getFullYear());
					}
					expiresHtml = `Expires: ${formatExpirationTime(endDate.toISOString())}<br>`;
				}
			}

			// Build popup: title + expires + description (truncated to 7 lines)
			let popupHtml = `<strong>${title}</strong><br>`;
			popupHtml += expiresHtml;

			if (description) {
				const descLines = description.split("\n");
				const maxLines = 7;
				if (descLines.length > maxLines) {
					popupHtml += descLines.slice(0, maxLines).join("<br>");
				} else {
					popupHtml += description.replace(/\n/g, "<br>");
				}
			}

			const totalLines = fullText.split("\n").length;
			if (totalLines > 7) {
				const buttonText = props.popupButtonText || "Show Alert Text";
				popupHtml += `
				<div style="align-items: center; display: flex; justify-content: center; padding: 0px;">
					<button class="show-placefile-text" style="margin-top: 10px; border-radius: 5px; background-color: #007bff; color: white; border: none; cursor: pointer;">
						${buttonText}
					</button>
				</div>`;
			}

			  layer.bindPopup(popupHtml, { pane: 'alertsPopupPane' });
			layer.on("popupopen", function () {
				window.cachedAlertText = fullText;
			});
			registerMapHitStackLayer(layer, {
				groupId: "placefile-" + url,
				kind: isMDPlacefile ? "Mesoscale Discussion" : "Placefile",
				label: title || props.name || "Placefile Item",
			});
		},
		id: "placefile-" + url,
	}).addTo(map);

	if (existing) {
		existing.layer = geoLayer;
	} else {
		window.placefileLayers[url] = { url: url, layer: geoLayer, intervalId: null, enabled: true, refreshMs: null };
	}
	applyPlacefileLayerOrder();

	// Update refresh interval if the placefile specifies one
	if (parsed.refreshSeconds && parsed.refreshSeconds > 0) {
		const entry = window.placefileLayers[url];
		const newRefreshMs = parsed.refreshSeconds * 1000;
		if (entry.refreshMs !== newRefreshMs) {
			entry.refreshMs = newRefreshMs;
			// Update the interval
			if (entry.intervalId) clearInterval(entry.intervalId);
			entry.intervalId = setInterval(() => {
				if (entry.enabled) fetchAndDrawPlacefile(url);
			}, newRefreshMs);
			// Also update config
			const pf = (config.placefiles || []).find(p => p.url === url);
			if (pf) pf.refreshMs = newRefreshMs;
		}
	}

}

function savePlacefileSettings() {
	localStorage.setItem("weatherAppSettings", JSON.stringify(config));
}

function removePlacefileLayer(url) {
	const entry = window.placefileLayers[url];
	if (!entry) return;
	if (entry.intervalId) clearInterval(entry.intervalId);
	if (entry.layer) {
		unregisterMapHitStackLayer(entry.layer);
		try { map.removeLayer(entry.layer); } catch (e) { }
	}
	delete window.placefileLayers[url];
}

function applyPlacefileLayerOrder() {
	const placefiles = config.placefiles || [];
	for (const pf of placefiles) {
		const entry = pf && pf.url ? window.placefileLayers[pf.url] : null;
		if (!entry || !entry.layer || entry.enabled === false) continue;
		if (!map.hasLayer(entry.layer)) continue;
		if (typeof entry.layer.bringToFront === "function") {
			entry.layer.bringToFront();
			refreshMapHitStackOrderForLayer(entry.layer);
		}
	}
}

function movePlacefile(url, direction) {
	const placefiles = config.placefiles || [];
	const index = placefiles.findIndex(p => p.url === url);
	if (index === -1) return;

	const targetIndex = direction === "up" ? index + 1 : index - 1;
	if (targetIndex < 0 || targetIndex >= placefiles.length) return;

	const moved = placefiles[index];
	placefiles[index] = placefiles[targetIndex];
	placefiles[targetIndex] = moved;
	savePlacefileSettings();
	applyPlacefileLayerOrder();
	renderPlacefileList();
}

function beginEditPlacefile(url) {
	window.editingPlacefileUrl = url;
	renderPlacefileList();
}

function cancelEditPlacefile() {
	window.editingPlacefileUrl = null;
	renderPlacefileList();
}

function editPlacefileUrl(oldUrl, newUrl) {
	newUrl = String(newUrl || "").trim();
	if (!newUrl) {
		showNotification("Placefile URL required", "", "#ffaa00");
		return;
	}

	const placefiles = config.placefiles || [];
	const index = placefiles.findIndex(p => p.url === oldUrl);
	if (index === -1) return;

	if (newUrl !== oldUrl && placefiles.some(p => p.url === newUrl)) {
		showNotification("Placefile already added: ", newUrl, "#ffaa00");
		return;
	}

	const previous = placefiles[index];
	const next = {
		...previous,
		url: newUrl,
		enabled: previous.enabled !== false,
		refreshMs: previous.refreshMs,
	};

	if (newUrl !== oldUrl) {
		removePlacefileLayer(oldUrl);
	}

	placefiles[index] = next;
	window.editingPlacefileUrl = null;
	savePlacefileSettings();

	if (next.enabled !== false) {
		setUpPlacefile(newUrl, next.refreshMs);
	} else {
		applyPlacefileLayerOrder();
	}
	renderPlacefileList();
}

function fetchAndDrawPlacefile(url) {
	const proxyUrl = PLACEFILE_PROXY_BASE + encodeURIComponent(url);
	const isPrivateNetwork = isPrivateNetworkUrl(url);

	let isCrossOrigin = true;
	try {
		const parsed = new URL(url, window.location.href);
		isCrossOrigin = parsed.origin !== window.location.origin;
	} catch (e) {
		// If URL parsing fails, use existing behavior and try direct fetch first.
		isCrossOrigin = false;
	}

	const candidates = isPrivateNetwork ? [url] : (isCrossOrigin ? [proxyUrl, url] : [url, proxyUrl]);

	const tryFetch = (index, lastError) => {
		if (index >= candidates.length) {
			console.error("Failed to load placefile:", url, lastError);
			showNotification("Failed to load placefile: ", url, "#ff4444");
			return;
		}

		fetch(candidates[index])
			.then(r => {
				if (!r.ok) throw new Error("Fetch failed: " + r.status);
				return r.text();
			})
			.then(text => drawPlacefile(url, text))
			.catch(e => {
				tryFetch(index + 1, e);
			});
	};

	tryFetch(0, null);
}

function setUpPlacefile(url, refreshMs) {
	if (!url || typeof url !== "string") return;
	url = url.trim();
	if (!url) return;

	refreshMs = refreshMs || 300000; // 5 minutes default

	// If already set up, clear old interval
	const existing = window.placefileLayers[url];
	if (existing && existing.intervalId) {
		clearInterval(existing.intervalId);
	}

	// Check if it's raw text (contains newlines or starts with common directives)
	const isRawText = url.includes("\n") || /^(Title:|Refresh:|Color:|Place:|Line:|Polygon:)/im.test(url);

	if (isRawText) {
		drawPlacefile(url, url);
	} else {
		// It's a URL — fetch it
		fetchAndDrawPlacefile(url);

		// Set up periodic refresh (may be overridden by drawPlacefile if the file has Refresh:)
		const intervalId = setInterval(() => {
			const entry = window.placefileLayers[url];
			if (entry && entry.enabled) {
				fetchAndDrawPlacefile(url);
			}
		}, refreshMs);

		if (window.placefileLayers[url]) {
			window.placefileLayers[url].intervalId = intervalId;
			window.placefileLayers[url].refreshMs = refreshMs;
		} else {
			window.placefileLayers[url] = { url: url, layer: null, intervalId: intervalId, enabled: true, refreshMs: refreshMs };
		}
	}

	// Add to config if not already there (skip built-in placefiles like MDs)
	const isBuiltIn = url === config.mdsUrl;
	if (!isRawText && !isBuiltIn && !config.placefiles.some(p => p.url === url)) {
		config.placefiles.push({ url: url, enabled: true, refreshMs: refreshMs });
		savePlacefileSettings();
	}
	applyPlacefileLayerOrder();
}

function removePlacefile(url) {
	removePlacefileLayer(url);
	config.placefiles = (config.placefiles || []).filter(p => p.url !== url);
	savePlacefileSettings();
	applyPlacefileLayerOrder();
	renderPlacefileList();
}

function togglePlacefile(url, enabled) {
	const entry = window.placefileLayers[url];
	if (entry) {
		entry.enabled = enabled;
		if (entry.layer) {
			if (enabled) {
				if (!map.hasLayer(entry.layer)) entry.layer.addTo(map);
				applyPlacefileLayerOrder();
			} else {
				if (map.hasLayer(entry.layer)) map.removeLayer(entry.layer);
			}
		}
	} else if (enabled) {
		// Disabled placefiles are not initialized at startup.
		// When user re-enables one, initialize and fetch it now.
		const pfCfg = (config.placefiles || []).find((p) => p.url === url);
		setUpPlacefile(url, pfCfg?.refreshMs);
	}
	const pf = (config.placefiles || []).find(p => p.url === url);
	if (pf) pf.enabled = enabled;
	if (entry) entry.enabled = enabled;
	savePlacefileSettings();
	applyPlacefileLayerOrder();
	renderPlacefileList();
}

function renderPlacefileList() {
	const container = document.getElementById("placefile-list");
	if (!container) return;
	container.innerHTML = "";

	const placefiles = config.placefiles || [];
	if (placefiles.length === 0) {
		const empty = document.createElement("div");
		empty.className = "placefile-empty";
		empty.textContent = "No custom placefiles added.";
		container.appendChild(empty);
		return;
	}

	const header = document.createElement("div");
	header.className = "placefile-layer-header";
	header.innerHTML = "<span>Top Layer</span><span>Bottom Layer</span>";
	container.appendChild(header);

	const createActionButton = (iconClass, title, className, onClick, disabled) => {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "placefile-action " + (className || "");
		button.innerHTML = '<i class="' + iconClass + '"></i>';
		button.title = title;
		button.setAttribute("aria-label", title);
		button.disabled = !!disabled;
		button.addEventListener("click", onClick);
		return button;
	};

	for (let index = placefiles.length - 1; index >= 0; index--) {
		const pf = placefiles[index];
		if (!pf || !pf.url) continue;
		const isEditing = window.editingPlacefileUrl === pf.url;

		const item = document.createElement("div");
		item.className = "placefile-item" +
			(pf.enabled === false ? " is-disabled" : "") +
			(isEditing ? " is-editing" : "");

		const toggle = document.createElement("input");
		toggle.type = "checkbox";
		toggle.className = "placefile-toggle";
		toggle.checked = pf.enabled !== false;
		toggle.addEventListener("change", () => togglePlacefile(pf.url, toggle.checked));

		const urlWrap = document.createElement("div");
		urlWrap.className = "placefile-url-wrap";

		if (isEditing) {
			const urlInput = document.createElement("input");
			urlInput.type = "text";
			urlInput.className = "placefile-url-edit";
			urlInput.value = pf.url;
			urlInput.addEventListener("keydown", (event) => {
				if (event.key === "Enter") editPlacefileUrl(pf.url, urlInput.value);
				if (event.key === "Escape") cancelEditPlacefile();
			});
			urlWrap.appendChild(urlInput);
			setTimeout(() => {
				urlInput.focus();
				urlInput.select();
			}, 0);
		} else {
			const urlSpan = document.createElement("span");
			urlSpan.className = "placefile-url";
			urlSpan.textContent = pf.url;
			urlSpan.title = pf.url;
			urlWrap.appendChild(urlSpan);
		}

		const actions = document.createElement("div");
		actions.className = "placefile-actions";

		const upBtn = createActionButton(
			"fas fa-arrow-up",
			"Move layer up",
			"placefile-move",
			() => movePlacefile(pf.url, "up"),
			index >= placefiles.length - 1 || isEditing
		);

		const downBtn = createActionButton(
			"fas fa-arrow-down",
			"Move layer down",
			"placefile-move",
			() => movePlacefile(pf.url, "down"),
			index <= 0 || isEditing
		);

		actions.appendChild(upBtn);
		actions.appendChild(downBtn);

		if (isEditing) {
			const input = urlWrap.querySelector(".placefile-url-edit");
			actions.appendChild(createActionButton(
				"fas fa-check",
				"Save URL",
				"placefile-save",
				() => editPlacefileUrl(pf.url, input.value),
				false
			));
			actions.appendChild(createActionButton(
				"fas fa-times",
				"Cancel edit",
				"placefile-cancel",
				cancelEditPlacefile,
				false
			));
		} else {
			actions.appendChild(createActionButton(
				"fas fa-pen",
				"Edit URL",
				"placefile-edit",
				() => beginEditPlacefile(pf.url),
				false
			));
			actions.appendChild(createActionButton(
				"fas fa-trash",
				"Remove placefile",
				"placefile-remove",
				() => removePlacefile(pf.url),
				false
			));
		}

		item.appendChild(toggle);
		item.appendChild(urlWrap);
		item.appendChild(actions);
		container.appendChild(item);
	}
}

function initPlacefiles() {
	for (const pf of (config.placefiles || [])) {
		if (pf.enabled !== false) {
			setUpPlacefile(pf.url, pf.refreshMs);
		}
	}
	renderPlacefileList();
}

function initMDs() {
	if (config.show.mds) {
		setUpPlacefile(config.mdsUrl);
	}
}

function toggleMDs(enabled) {
	config.show.mds = enabled;
	localStorage.setItem("weatherAppSettings", JSON.stringify(config));

	if (enabled) {
		// Set up if not already loaded
		if (!window.placefileLayers[config.mdsUrl]) {
			setUpPlacefile(config.mdsUrl);
		} else {
			togglePlacefile(config.mdsUrl, true);
		}
	} else {
		if (window.placefileLayers[config.mdsUrl]) {
			togglePlacefile(config.mdsUrl, false);
		}
	}
}

function sponsorMePlease() {
	// Check if user has already clicked a sponsor link
	if (localStorage.getItem("sponsorNotificationDismissed")) {
		return;
	}

	const container = document.getElementById("notification-container");
	if (!container) return;

	const toast = document.createElement("div");
	toast.className = "notification-toast";
	toast.style.backgroundColor = "#4CAF50";

	const titleMsg = document.createElement("span");
	titleMsg.textContent = "Support Me! ";
	titleMsg.style.fontWeight = "bold";

	const linksContainer = document.createElement("span");
	linksContainer.style.marginLeft = "10px";

	const links = [
		{ text: "Patreon", url: "https://patreon.com/Arch881010" },
		{ text: "GitHub Sponsors", url: "https://github.com/sponsors/Arch881010" }
	];

	links.forEach((link, index) => {
		const anchor = document.createElement("a");
		anchor.href = link.url;
		anchor.textContent = link.text;
		anchor.style.color = "white";
		anchor.style.textDecoration = "underline";
		anchor.style.cursor = "pointer";
		anchor.target = "_blank";
		anchor.rel = "noopener noreferrer";

		anchor.onclick = (e) => {
			localStorage.setItem("sponsorNotificationDismissed", "true");
			dismissToast(toast);
		};

		linksContainer.appendChild(anchor);

		if (index < links.length - 1) {
			const separator = document.createTextNode(" | ");
			linksContainer.appendChild(separator);
		}
	});

	const closeBtn = document.createElement("button");
	closeBtn.className = "notification-toast-close";
	closeBtn.innerHTML = "&#x2715;";
	closeBtn.onclick = () => {
		localStorage.setItem("sponsorNotificationDismissed", "true");
		dismissToast(toast);
	};

	toast.appendChild(titleMsg);
	toast.appendChild(linksContainer);
	toast.appendChild(closeBtn);
	container.appendChild(toast);

	setTimeout(() => dismissToast(toast), 8000);
}

// Call sponsor notification after map is fully loaded
document.addEventListener("mapLoaded", () => {
	sponsorMePlease();
});
