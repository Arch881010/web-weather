/** @format */

// Hide the loading screen once the map is fully loaded
window.addEventListener("load", () => {
	const loadingScreen = document.getElementById("loading-screen");
	loadingScreen.style.display = "none";
	updateRadarLayer();
	addCountyBorders();
	updateWatches();
	updateCountdown();

	updateWeatherAlerts();
});
