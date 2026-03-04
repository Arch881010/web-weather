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
	const color = colorsArray[convertToText(text)];
	return color || colorsArray["Default"];
}

const colorsArray = {
	"Tsunami Warning": "#FD6347",
	"Tornado Warning": "#ff0000",
	"Extreme Wind Warning": "#FF8C00",
	"Severe Thunderstorm Warning": "#FFA500",
	"Flash Flood Warning": "#8B0000",
	"Flash Flood Statement": "#8B0000",
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
				map.removeLayer(layer);
			}
		});
	} catch (e) {
		console.warn(e);
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

	// Keep watches and warnings separate when deduping
	function dedupeCategory(eventType) {
		const evt = (eventType || "").toLowerCase();
		if (evt.includes("watch")) return `watch:${eventType}`;
		if (evt.includes("warning")) return `warning:${eventType}`;
		return `other:${eventType}`;
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
		feature.properties.newName = `${tag.toTitleCase()} ${feature.properties.event}`;
		if (eventName.includes("tornado")) {
			switch (tag) {
				case "considerable":
					feature.properties.color = "#ff00ff";
					break;
				case "catastrophic":
					feature.properties.color = "#ff00ff";
					newFeature.properties.color = "#000000";
					pushFeature = true;
					break;
				case "observed":
					newFeature.properties.color = "#000000";
					pushFeature = true;
					break;
				default:
					break;
			}
		} else if (eventName.includes("severe th")) {
			switch (tag) {
				case "destructive":
					newFeature.properties.color = "#ff0000";
					//newfeature.properties.size.border = size - change;
					pushFeature = true;
					break;
				case "considerable":
					newFeature.properties.color = "#ff0000";
					pushFeature = true;
					break;
				case "possible":
					newFeature.properties.color = "#000000";
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
			feature.properties.size.extra = tag === "considerable" ? 1 : size - change;
			newFeature.properties.size = feature.properties.size;
			newFeature.properties.tag = tag;
			alertExtras.features.push(newFeature);
		} else {
			feature.properties.size.border = size;
			feature.properties.size.polygon = size - change;
		}
		alertBackgrounds.features.push(feature);
	}

	data = alertBackgrounds;

	L.geoJSON(data, {
		style: function (feature) {
			return {
				color: "black", // Outer border color
				weight: feature.properties.size.border + change || size + change, // Outer border width
				opacity: config.opacity.polygon, // Outer border opacity
				fillOpacity: 0, // Make the polygon fill transparent
			};
		},
		id: "weather-alerts-border",
	}).addTo(map);

	// Add the GeoJSON layer to the map with color coding
	L.geoJSON(data, {
		style: function (feature) {
			return {
				color: feature.properties.color || getColor(feature.properties.event), // Border color
				weight: feature.properties.size.polygon || size, // Border width
				opacity: config.opacity.polygon, // Outer border opacity
				fillOpacity: config.opacity.polygon_fill, // Polygon fill opacity
			};
		},
		onEachFeature: function (feature, layer) {
			if (feature.properties) {
				layer.bindPopup(getPopupText(feature));
			}

			layer.on("popupopen", function () {
				// console.log("Popup opened for feature:", JSON.stringify(feature));
				window.cachedAlertText = getAlertText(feature);
			});
		},
		id: "weather-alerts",
	})
		.addTo(map)
		.bringToFront();

	L.geoJSON(alertExtras, {
		style: function (feature) {
			return {
				color: feature.properties.color || getColor(feature.properties.event), // Border color
				weight: feature.properties.size.extra || (size - (change + 2)), // Border width
				opacity: config.opacity.polygon, // Outer border opacity
				//fillOpacity: config.opacity.polygon_fill, // Polygon fill opacity
				fillOpacity: 0
			};
		},
		id: "alert-extras",
		interactive: false
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
		else drawPolygons(current_features);
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

