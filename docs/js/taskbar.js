/** @format */

document.addEventListener("DOMContentLoaded", () => {
	// Create a taskbar control
	const taskbar = L.control({ position: "bottomleft" });

	taskbar.onAdd = function () {
		const div = L.DomUtil.create("div", "taskbar");
		div.id = "taskbar";
		div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span>Settings</span>
                <button id="open-settings">Open Settings</button>
            </div>
        `;
		return div;
	};

	taskbar.addTo(map);

	const settingsPanel = document.getElementById("settings-panel");

	// Function to save settings to local storage and update config
	const saveSettings = () => {
		const saveSettingsCheckbox =
			document.getElementById("save-settings").checked;
		const opacityRadar = document.getElementById("opacity-radar").value / 100;
		const opacityPolygonFill =
			document.getElementById("opacity-polygon-fill").value / 100;
		const opacityPolygon =
			document.getElementById("opacity-polygon").value / 100;
		const opacityCountyBorders =
			document.getElementById("opacity-county-borders").value / 100;

		const settings = {
			saveSettings: saveSettingsCheckbox,
			opacity: {
				radar: opacityRadar,
				polygon_fill: opacityPolygonFill,
				polygon: opacityPolygon,
				countyBorders: opacityCountyBorders,
			},
		};

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

		window.timeUntilNextUpdate = 1;
		addCountyBorders();
	};

	// Load settings from local storage
	const loadSettings = () => {
		const savedSettings = JSON.parse(
			localStorage.getItem("weatherAppSettings")
		);
		if (savedSettings) {
			document.getElementById("save-settings").checked =
				savedSettings.saveSettings;
			document.getElementById("opacity-radar").value =
				savedSettings.opacity.radar * 100;
			document.getElementById("opacity-polygon-fill").value =
				savedSettings.opacity.polygon_fill * 100;
			document.getElementById("opacity-polygon").value =
				savedSettings.opacity.polygon * 100;
			document.getElementById("opacity-county-borders").value =
				savedSettings.opacity.countyBorders * 100;

			// Update config object
			config.opacity.radar = savedSettings.opacity.radar;
			config.opacity.polygon_fill = savedSettings.opacity.polygon_fill;
			config.opacity.polygon = savedSettings.opacity.polygon;
			config.opacity.countyBorders = savedSettings.opacity.countyBorders;
		}
	};

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
