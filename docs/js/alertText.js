/** @format */

function getAlertText(feature) {
	const properties = feature.properties;
	const parameters = properties.parameters;
	const data = {
		event: properties.event,
		sender: properties.senderName,
		sent: properties.sent,
		headline: "",
		description: properties.description,
		instruction: properties.instruction,
	};

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

	return text.trim();
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
