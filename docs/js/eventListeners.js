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
	const loadingScreen = document.getElementById("loading-screen");
	loadingScreen.style.display = "none";
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
