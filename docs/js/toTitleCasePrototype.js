String.prototype.toTitleCase = function () {
	// https://stackoverflow.com/a/196991
	return this.replace(
		/\w\S*/g,
		(text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
	);
};