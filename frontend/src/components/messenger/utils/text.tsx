import React, { type ReactNode } from "react";

export const renderHighlightedText = (
	text: string,
	keyword: string,
): ReactNode => {
	const normalizedKeyword = keyword.trim();
	if (!normalizedKeyword) {
		return text;
	}

	const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const parts = text.split(new RegExp(`(${escaped})`, "ig"));

	return parts.map((part, index) => {
		if (part.toLowerCase() === normalizedKeyword.toLowerCase()) {
			return React.createElement(
				"span",
				{
					key: `${part}-${index}`,
					style: {
						backgroundColor: "yellow",
						color: "black",
						borderRadius: 2,
						padding: "0 2px",
					},
				},
				part,
			);
		}
		return part;
	});
};
