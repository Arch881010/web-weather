// Event listener to handle tab visibility change
document.addEventListener("visibilitychange", () => {
	if (document.visibilityState != "visible") return;
	if (timePassedAsSeconds(window.lastUpdate) < 60) return;
	forceUpdate();
});