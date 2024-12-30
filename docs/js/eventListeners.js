// Event listener to handle tab visibility change
document.addEventListener("visibilitychange", () => {
	if (document.visibilityState != "visible") return;
	if (timePassedAsSeconds(window.lastUpdate) < 60) return;
	forceUpdate();
});

// Hide the loading screen once the map is fully loaded
document.onreadystatechange = () => {
	const loadingScreen = document.getElementById("loading-screen");
	loadingScreen.style.display = "none";
	updateRadarLayer();
	addCountyBorders();
	updateCountdown();

	updateWeatherAlerts();
};