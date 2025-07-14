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
	"Tornado Warning": "#FF0000",
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
if (config.dev) {
	console.info("Development mode is enabled.");
	console.info(
		"Logging these features (warnings):",
		(log_features || ["None"]).toString()
	);
}

// Add state borders to the map
window.countyBordersShown = false;

async function fetchCountyBorders() {
	counties = await (await fetch("./json/counties.json")).json();
}

function getZoom() {
	try {
		return map.getZoom();
	} catch (e) {
		return 9;
	}
}

function addCountyBorders() {
	// If the zoom is < 9, that means we are zoomed out and can hide the county borders
	if (getZoom() < 9) {
		if (countyBordersLayer) {
			map.removeLayer(countyBordersLayer);
			countyBordersLayer = null;
			console.info("Hiding county borders.");
		}
		window.countyBordersShown = false;
	} else {
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
		}
		window.countyBordersShown = true;
	}
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

	if (log_features.matchesAny(weatherEvent) && config.dev) {
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

// Function to fetch and update radar layer
function updateRadarLayer() {

	// If the radar opacity is set to 0, skip loading new radar data and clear the layer if it exists
	if (userSettings.opacity.radar == 0) {
		console.error(
			"Radar layer opacity is set to 0, no need to load new radar data, skipping."
		);
		clearLayers(["radar-layer"]);
		return;
	}

	// Add the radar layer
	radarTileMap = userSettings.radar_tilemap;
	if (radarTileMap == undefined) radarTileMap = "n0q";

	// Check if the radar layer already exists; update opacity if it does, otherwise add it
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
		clearLayers(["radar-layer"]);
	}
	

	L.tileLayer
		.wms(
			`https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/${radarTileMap}.cgi`,
			{
				layers: `nexrad-${radarTileMap}-900913`,
				//layers: radarTileMap,
				format: "image/png",
				transparent: true,
				attribution: "Weather data © 2024 IEM Nexrad",
				id: "radar-layer",
				opacity: config.opacity.radar, // Set the opacity of the radar layer
			}
		)
		.addTo(map);
		console.info("Radar layer updated.");
}



async function addCountdown() {
	// Add countdown timer to the map
	const countdownDiv = L.control({ position: "bottomright" });
	countdownDiv.onAdd = function () {
		const div = L.DomUtil.create("div", "countdown");
		div.id = "countdown";
		div.innerText = "Next update in: 60s";
		div.style.padding = "5px";
		div.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
		div.style.color = "white";
		div.style.fontSize = "14px";
		div.style.borderRadius = "5px";
		div.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)";
		return div;
	};
	countdownDiv.addTo(map);
}

// Function to update the countdown timer
function updateCountdown(force) {
	force = force || false;
	if (window.countdownIsRunning && !force) {
		return console.warn("The countdown is already active, skipping.");
	}
	const countdownElement = document.getElementById("countdown");
	let timeLeft = 60;
	window.timeUntilNextUpdate = timeLeft;
	window.countdownIsRunning = true;
	window.lastUpdate = new Date();

	setInterval(() => {
		timeLeft = window.timeUntilNextUpdate;
		timeLeft -= 1;
		countdownElement.innerText = `Next update in: ${timeLeft}s`;

		if (timeLeft <= 0) {
			timeLeft = 60;
			window.timeUntilNextUpdate = timeLeft;
			updateWeatherAlerts();
			updateRadarLayer();
		}
		window.timeUntilNextUpdate = timeLeft;
	}, 1000);
}

function drawPolygons(data) {
	// Add the black border around each polygon
	if (window.countdown)
	clearLayers(["weather-alerts", "weather-alerts-border"]);

	if (config.opacity.polygon == 0) return;

	L.geoJSON(data, {
		style: function (feature) {
			return {
				color: "black", // Outer border color
				weight: 5, // Outer border width
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
				weight: 3, // Border width
				opacity: config.opacity.polygon, // Outer border opacity
				fillOpacity: config.opacity.polygon_fill, // Polygon fill opacity
			};
		},
		onEachFeature: function (feature, layer) {
			if (feature.properties) {
				layer.bindPopup(getPopupText(feature));
			}

			layer.on("popupopen", function () {
				console.log("Popup opened for feature:", feature);
				window.cachedAlertText = getAlertText(feature);
			});
		},
		id: "weather-alerts",
	})
		.addTo(map)
		.bringToFront();
}

function redrawPolygons() {
	if (current_features.length <= 0) updateWeatherAlerts();
	else drawPolygons(current_features);
}

function getSevereStorm(feature) {
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

		if (params.parameters.hail.maxHail.replaceAll("\"", "") == "0.75")
		console.warn(params);

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
			if (torSeverity != "") {
				popupContent += `Threat: ${torSeverity}<br>`;
			}
		}
	} else {
		popupContent += `This storm has weakened below severe limits.\nThis warning will expire soon.\n<br>`;
	}

	return popupContent;
}

function forceUpdate() {
	window.timeUntilNextUpdate = 1;
}
