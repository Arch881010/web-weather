/** @format */

String.prototype.toTitleCase = function () {
	// https://stackoverflow.com/a/196991
	return this.replace(
		/\w\S*/g,
		(text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
	);
};
String.prototype.toSingular = function() {
	let strLen = this.length;
	let lastChars = [];
	if (strLen < 3) {
		lastChars.push(this.charAt(strLen - 1));
	} else {
		lastChars.push(this.charAt(strLen - 3));
		lastChars.push(this.charAt(strLen - 2));
		lastChars.push(this.charAt(strLen - 1));
	}

	let lastIndex = lastChars.length - 1;
	if (lastIndex == 0) {
		if (lastChars[0] == "s") return this.slice(0, -1);
		return this;
	}

	if (lastChars[lastIndex] == "s") {
		if (lastChars[lastIndex - 1] == "e" && lastChars[lastIndex - 2] == "i") {
			return this.slice(0, -3) + "y";
		} else if (lastChars[lastIndex - 1] == "e" && lastChars[lastIndex - 2] == "v") {
			return this.slice(0, -3) + "f";
		} else if (lastChars[lastIndex - 1] == "e") {
			return this.slice(0, -2);
		} else {
			return this.slice(0, -1);
		}
	}

	return this;
}


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
