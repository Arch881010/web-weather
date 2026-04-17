/** @format */

function getAlertText(feature) {
	const properties = feature.properties;
	const parameters = properties.parameters;
	let data = {
		event: properties.event,
		sender: properties.senderName,
		sent: properties.sent,
		headline: "",
		description: properties.description,
		instruction: properties.instruction,
	};

	if (properties.event.includes("Watch")) data = getWatchText(properties);

	if (typeof parameters.NWSheadline === "string") {
		data.headline = parameters.NWSheadline;
	} else if (
		typeof parameters.NWSheadline === "object" ||
		typeof parameters.NWSheadline === "array"
	) {
		data.headline = parameters.NWSheadline.join("\n");
	} else {
		data.headline = properties.headline;
	}

	if (data.headline != "") data.headline += "\n";

	// Check if the headline contains a time zone abbreviation
	// Copilot
	const timeZoneMatch = properties.headline.match(
		/\b(EST|EDT|CST|CDT|MST|MDT|PST|PDT)\b/
	);
	const timeZone = timeZoneMatch ? timeZoneMatch[0] : "UTC";
	data.sent = formatDateTime(data.sent, timeZone);
	// EOC

	let text = `
${data.event}
${data.sender}
${data.sent}
${data.headline}

${data.description}

`;
	if (data.instruction) {
		text += `PRECAUTIONARY/PREPARDNESS ACTIONS...

${data.instruction}
`;
	}

	if (text.length < 250) {
		console.error("Alert text is too short:", text);
		console.error("Feature properties:", properties);
		console.error("Data object:", data);
	}

	return text.trim();
}

function getWatchText(properties) {
	if (properties.watchEvent || properties.watchSent || properties.watchExpires) {
		const watchLabel = properties.watchEvent || properties.event || "Watch";
		const watchNumber = properties.watchNumber ? ` #${properties.watchNumber}` : "";
		const watchSummary = [
			`${watchLabel}${watchNumber}`,
			properties.countyCount ? `${properties.countyCount} counties affected` : "",
			properties.watchExpires ? `Expires ${formatDateTime(properties.watchExpires, "UTC")}` : "",
		].filter(Boolean).join("\n");

		return {
			event: `${watchLabel}${watchNumber}`,
			sender: properties.senderName || "Storm Prediction Center",
			sent: properties.sent,
			headline: properties.headline || "",
			description: properties.description || watchSummary,
			instruction: properties.instruction,
		};
	}

	let text = properties.description || "";
	properties.headline = properties.headline || "";

	// Let's clean up the text
	text = text.replace(/&amp;/g, "&");
	const textAsArray = text
		.split("\n")
		.map((line) => {
			line = line.replace("*", "");
			line = line.trim();
			return line;
		})
		.filter((line) => line !== "");

	properties.event = textAsArray[2] || properties.event;
	properties.senderName = textAsArray[3] || properties.senderName;
	let findheadline = true;
	let i = 5;
	while (findheadline && i < textAsArray.length) {
		if (textAsArray[i].toTitleCase().includes("For")) {
			properties.headline +=
				textAsArray[i].toTitleCase().split("For")[0].trim() + ".";
			findheadline = false;
		} else {
			properties.headline += textAsArray[i] + " ";
		}
		i++;
	}

	return {
		event: properties.event,
		sender: properties.senderName,
		sent: properties.sent,
		headline: "",
		description: text,
		instruction: properties.instruction,
	};
}

function formatDateTime(dateTimeStr, timeZoneAbbr) {
	// Copilot
	const timeZoneMap = {
		CST: "America/Chicago",
		CDT: "America/Chicago",
		EST: "America/New_York",
		EDT: "America/New_York",
		MST: "America/Denver",
		MDT: "America/Denver",
		PST: "America/Los_Angeles",
		PDT: "America/Los_Angeles",
	};

	const timeZone = timeZoneMap[timeZoneAbbr] || "UTC";
	// EOC
	const date = new Date(dateTimeStr);
	const options = {
		weekday: "short",
		hour: "numeric",
		minute: "numeric",
		timeZoneName: "short",
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: timeZone,
	};

	// Copilot
	return date.toLocaleDateString("en-US", options);
}
