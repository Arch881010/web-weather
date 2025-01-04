/** @format */

const mapLoadedEvent = new Event("mapLoaded", {
	bubbles: true,
	cancelable: true,
	composed: true,
});

// Event listener to handle tab visibility change
document.addEventListener("visibilitychange", () => {
	if (document.visibilityState != "visible") return;
	if (timePassedAsSeconds(window.lastUpdate) < 60) return;
	forceUpdate();
});

// Hide the loading screen once the map is fully loaded
document.onreadystatechange = () => {
	updateRadarLayer();
	addCountyBorders();
	updateCountdown();

	updateWeatherAlerts(true);
};

document.addEventListener("mapLoaded", () => {
	// Adds ease-out transition to the loading screen then removes it.
	const loadingScreen = document.getElementById("loading-screen");
	loadingScreen.style.transition = "opacity 1.5s ease-out";
	loadingScreen.style.opacity = "0";
	setTimeout(() => {
		loadingScreen.style.display = "none";
	}, 1500); // Match the duration of the CSS transition

	// Fetches the version data to store it in our settings
	fetch("./json/version.json")
		.then((response) => response.json())
		.then((data) => {
			document.getElementById("version-number").textContent = data["number"];
			document.getElementById("time-updated").textContent = data["time-updated"];
			document.getElementById("recent-commit").textContent = data["recent-commit"];	
		})
});

// Event listener when a variable is updated

document.addEventListener("DOMContentLoaded", function () {
	// Create the modal element
	const modal = document.createElement("div");
	modal.id = "alert-text-modal";
	modal.innerHTML = `
        <div id="alert-text-modal-content">
            <span id="close-modal">&times;</span>
            <pre id="alert-text-content" style="white-space: pre-wrap;"></pre>
        </div>
    `;
	document.body.appendChild(modal);

	// Handle button click to show alert text
	document.addEventListener("click", function (event) {
		if (event.target && event.target.id === "show-alert-text") {
			const alertText = window.cachedAlertText || "No alert text available";
			document.getElementById("alert-text-content").textContent = alertText;
			document.getElementById("alert-text-modal").style.display = "block";
		}
	});

	// Handle modal close
	document.getElementById("close-modal").onclick = function () {
		document.getElementById("alert-text-modal").style.display = "none";
	};

	// Close modal when clicking outside of the modal content
	window.onclick = function (event) {
		if (event.target === modal) {
			modal.style.display = "none";
		}
	};
});
