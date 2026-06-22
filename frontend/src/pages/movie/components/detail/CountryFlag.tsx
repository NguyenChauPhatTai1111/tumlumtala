import { Box } from "@mui/material";
import { getCountryIsoCode } from "@pages/movie/utils";

export const CountryFlag = ({
	slug,
	size = 18,
}: {
	slug: string;
	size?: number;
}) => {
	const iso = getCountryIsoCode(slug);
	if (!iso || iso === "un") return null;

	return (
		<Box
			component="span"
			className={`fi fi-${iso}`}
			sx={{
				fontSize: size,
				lineHeight: 1,
				display: "inline-block",
				flexShrink: 0,
				overflow: "hidden",
				borderRadius: "2px",
			}}
		/>
	);
};
