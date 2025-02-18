/** @format */
// Copilot

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
		document.getElementById("radar-tilemap").value = savedSettings.radar_tilemap;

		// Update config object
		config.opacity.radar = savedSettings.opacity.radar;
		config.opacity.polygon_fill = savedSettings.opacity.polygon_fill;
		config.opacity.polygon = savedSettings.opacity.polygon;
		config.opacity.countyBorders = savedSettings.opacity.countyBorders;
		config.radar = savedSettings.radar_tilemap;

		config.show.watches = true;
		return savedSettings;
	} else {
		// Set default values
		document.getElementById("opacity-radar").value = 100;
		document.getElementById("opacity-polygon-fill").value = 15;
		document.getElementById("opacity-polygon").value = 100;
		document.getElementById("opacity-county-borders").value = 100;
		document.getElementById("radar-tilemap").value = "n0q";

		// Update config object
		config.opacity.radar = 1;
		config.opacity.polygon_fill = 0.15;
		config.opacity.polygon = 1;
		config.opacity.countyBorders = 1;
		
		return {
			saveSettings: false,
			opacity: {
				radar: 1,
				polygon_fill: 0.15,
				polygon: 1,
				countyBorders: 1,
			},
			radar_tilemap: "n0q",
		}
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

	redrawAlerts();
	updateRadarLayer();
	addCountyBorders();
};

document.addEventListener("DOMContentLoaded", () => {
	loadSettings();
	// Create a taskbar control
	const taskbar = L.control({ position: "bottomleft" });

	taskbar.onAdd = function () {
		const div = L.DomUtil.create("div", "taskbar");
		div.id = "taskbar";
		div.innerHTML = `
                <button id="open-settings">Open Settings</button>
        `;
		return div;
	};

	taskbar.addTo(map);
	//EOC

	const settingsPanel = document.getElementById("settings-panel");

	// Load settings from local storage

	// Load settings on page load
	loadSettings();

	// Open settings panel
	document.getElementById("open-settings").addEventListener("click", () => {
		settingsPanel.style.display = "flex";
	});

	// Close settings panel and save settings
	document.getElementById("close-settings").addEventListener("click", () => {
		console.info("Settings saved");
		saveSettings();
		settingsPanel.style.display = "none";
	});
});
