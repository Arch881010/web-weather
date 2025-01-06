/** @format */

String.prototype.toTitleCase = function () {
	// https://stackoverflow.com/a/196991
	return this.replace(
		/\w\S*/g,
		(text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
	);
};

Array.prototype.matchesAny = function (text) {
	for (let i = 0; i < this.length; i++) {
		if (text.includes(this[i])) {
			return true;
		}
	}
	return false;
};

Date.prototype.timePassedAsSeconds = function () {
	return Math.floor((new Date() - this) / 1000);
};
