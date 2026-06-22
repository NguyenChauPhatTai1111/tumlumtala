import { Box, Switch, Typography } from "@mui/material";
import React from "react";

export type ToggleOption = {
	value: string;
	label: string;
	color?: "success" | "warning" | "error" | "default";
};

type ToggleProps<T> = {
	row: T;
	value: string;
	options: ToggleOption[];
	onChange?: (row: T, newValue: string) => void;
};

export function Toggle<T>({ row, value, options, onChange }: ToggleProps<T>) {
	const [checked, setChecked] = React.useState(false);

	const [activeOption, inactiveOption] = options;

	React.useEffect(() => {
		setChecked(value === activeOption.value);
	}, [value, activeOption.value]);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newChecked = event.target.checked;
		setChecked(newChecked);

		const newValue = newChecked ? activeOption.value : inactiveOption.value;

		if (newValue !== value) {
			onChange?.(row, newValue);
		}
	};

	return (
		<Box
			sx={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				gap: 1,
			}}
		>
			<Typography variant="caption">{inactiveOption.label}</Typography>

			<Switch
				checked={checked}
				onChange={handleChange}
				color={activeOption.color || "success"}
			/>

			<Typography variant="caption">{activeOption.label}</Typography>
		</Box>
	);
}
