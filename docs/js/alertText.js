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
	let text = properties.description;
	properties.headline = properties.headline || "";

	// Let's clean up the text
	text = text.replace(/&amp;/g, "&");
	textAsArray = text
		.split("\n")
		.map((line) => {
			line = line.replace("*", "");
			line = line.trim();
			return line;
		})
		.filter((line) => line !== "");

	properties.event = textAsArray[2];
	properties.senderName = textAsArray[3];
	let findheadline = true;
	let i = 5;
	while (findheadline) {
		if (textAsArray[i].toTitleCase().includes("For")) {
			properties.headline +=
				textAsArray[i].toTitleCase().split("For")[0].trim() + ".";
			findheadline = false;
		} else {
			properties.headline += textAsArray[i] + " ";
		}
		i++;
	}

	const data = {
		event: properties.event,
		sender: properties.senderName,
		sent: properties.sent,
		headline: "",
		description: text,
		instruction: properties.instruction,
	};

	i = 5;
	return data;
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
