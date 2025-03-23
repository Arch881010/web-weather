/** @format */

const default_config = {
	opacity: {
		radar: 0.5,
		polygon_fill: 0.15,
		polygon: 1,
		countyBorders: 0.5,
	},
	alerts: {
		watches: true,
		warnings: true,
		advisories: true,
		disabled_watches: [],
		disabled_warnings: [],
		disabled_advisories: []
	},
		
	radarTilemap: "n0q",
	dev: false,
	urls: {
		warnings: "https://api.weather.gov/alerts/active?status=actual&urgency=Immediate,Expected,Future,Past,Unknown&limit=300" 
	},
	devUrls: {
		warnings: "./test-data/wa/2025/current.json"
	}
};

function checkConfig() {
	let data = localStorage.getItem("dev");
	if (data) {
		default_config.dev = true;
	}
};
checkConfig();

const config = default_config;

const loadSettings = () => {
	const savedSettings = JSON.parse(localStorage.getItem("weatherAppSettings"));
	if (savedSettings) {
		document.getElementById("save-settings").checked =
			savedSettings.saveSettings || false;
		document.getElementById("opacity-radar").value =
			savedSettings.opacity.radar * 100;
		document.getElementById("opacity-polygon-fill").value =
			savedSettings.opacity.polygon_fill * 100;
		document.getElementById("opacity-polygon").value =
			savedSettings.opacity.polygon * 100;
		document.getElementById("opacity-county-borders").value =
			savedSettings.opacity.countyBorders * 100;
		document.getElementById("radar-tilemap").value =
			savedSettings.radar_tilemap;

		// Update config object
		config.opacity.radar = savedSettings.opacity.radar;
		config.opacity.polygon_fill = savedSettings.opacity.polygon_fill;
		config.opacity.polygon = savedSettings.opacity.polygon;
		config.opacity.countyBorders = savedSettings.opacity.countyBorders;
		config.radar = savedSettings.radar_tilemap;
		try {
			for (let key of savedSettings.alerts.keys()) {
				config.alerts[key] = savedSettings.alerts[key];
			}
		} catch(err){};

		return config;
	} else {
		// Set default values
		document.getElementById("opacity-radar").value = default_config.opacity.radar * 100;
		document.getElementById("opacity-polygon-fill").value = default_config.opacity.polygon_fill * 100;
		document.getElementById("opacity-polygon").value = default_config.opacity.polygon * 100;
		document.getElementById("opacity-county-borders").value = default_config.opacity.countyBorders;
		document.getElementById("radar-tilemap").value = default_config.radarTilemap;

		editToggables();

		return config;
	}
};

let userSettings = loadSettings();

// Function to save settings to local storage and update config
const saveSettings = () => {
	const saveSettingsCheckbox = document.getElementById("save-settings").checked;
	const opacityRadar = document.getElementById("opacity-radar").value / 100;
	const opacityPolygonFill =
		document.getElementById("opacity-polygon-fill").value / 100;
	const opacityPolygon = document.getElementById("opacity-polygon").value / 100;
	const opacityCountyBorders =
		document.getElementById("opacity-county-borders").value / 100;
	const radarTilemap = document.getElementById("radar-tilemap").value;

	const settings = {
		saveSettings: saveSettingsCheckbox,
		opacity: {
			radar: opacityRadar,
			polygon_fill: opacityPolygonFill,
			polygon: opacityPolygon,
			countyBorders: opacityCountyBorders,
		},
		radar_tilemap: radarTilemap,
	};

	userSettings = settings;

	if (saveSettingsCheckbox) {
		localStorage.setItem("weatherAppSettings", JSON.stringify(settings));
	} else {
		try {
			localStorage.removeItem("weatherAppSettings");
		} catch (e) {}
	}

	// Update config object
	config.opacity.radar = opacityRadar;
	config.opacity.polygon_fill = opacityPolygonFill;
	config.opacity.polygon = opacityPolygon;
	config.opacity.countyBorders = opacityCountyBorders;

	redrawPolygons();
	updateRadarLayer();
	addCountyBorders();
	editToggables();
};

function editToggables() {
	const toggables = ["toggle-warnings", "toggle-advisories", "toggle-watches", "toggle-flood", "toggle-tornado", "toggle-severe-thunderstorm"];
	const warnToggables = ["toggle-flood", "toggle-tornado", "toggle-severe-thunderstorm"];
	for (let id of toggables) {
		const elm = document.getElementById(id);
		console.error(elm.checked);
		if (!elm.checked) {
			let spltId = id.split("-");
			let newId = "";
			for (let i = 1; i < spltId.length; i++) {
				newId += spltId[i] + "-";
			}
			newId = newId.slice(0, -1);
			console.info(newId)
			if (warnToggables.matchesAny(id)) {
				config.alerts.disabled_warnings.push(newId.toSingular())
			}
		}
	}
}