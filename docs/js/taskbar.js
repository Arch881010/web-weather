/** @format */
// Copilot

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
