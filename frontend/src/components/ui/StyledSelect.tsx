import {
	FormControl,
	FormHelperText,
	MenuItem,
	Select,
	type SelectProps,
	styled,
} from "@mui/material";
import type { ReactNode } from "react";

export const StyledSelect = styled(Select)(({ theme }) => ({
	borderRadius: "8px",
	"& .MuiOutlinedInput-notchedOutline": {
		borderColor: theme.palette.divider,
	},
	"&:hover .MuiOutlinedInput-notchedOutline": {
		borderColor: theme.palette.primary.main,
	},
	"&.Mui-focused .MuiOutlinedInput-notchedOutline": {
		borderColor: theme.palette.primary.main,
		borderWidth: 1,
		boxShadow: `0 0 0 3px ${theme.palette.primary.light}40`,
	},
	"& .MuiOutlinedInput-input": {
		padding: "12px 14px",
		fontSize: "14px",
	},
}));

interface FormSelectProps extends Omit<SelectProps, "children"> {
	options: Array<{
		value: string | number;
		label: string;
	}>;
	label?: string;
	error?: boolean;
	helperText?: string;
	children?: ReactNode;
}

const DEFAULT_MENU_PROPS: SelectProps["MenuProps"] = {
	PaperProps: {
		style: { maxHeight: 240, overflowY: "auto" },
	},
};

export const FormSelect = ({
	options,
	label,
	error,
	helperText,
	children,
	...props
}: FormSelectProps) => (
	<FormControl fullWidth error={error}>
		<StyledSelect MenuProps={DEFAULT_MENU_PROPS} {...props}>
			{children ||
				options.map((option) => (
					<MenuItem key={option.value} value={option.value}>
						{option.label}
					</MenuItem>
				))}
		</StyledSelect>
		{helperText && <FormHelperText>{helperText}</FormHelperText>}
	</FormControl>
);

// Variant: Compact
export const CompactSelect = (props: FormSelectProps) => (
	<FormSelect size="small" {...props} />
);

// Variant: Multiple select
interface MultiSelectProps extends Omit<SelectProps, "children"> {
	options: Array<{
		value: string | number;
		label: string;
	}>;
	label?: string;
	error?: boolean;
	helperText?: string;
}

export const MultiSelect = ({
	options,
	label,
	error,
	helperText,
	...props
}: MultiSelectProps) => (
	<FormControl fullWidth error={error}>
		<StyledSelect
			multiple
			renderValue={(selected) => (selected as string[]).join(", ")}
			MenuProps={DEFAULT_MENU_PROPS}
			{...props}
		>
			{options.map((option) => (
				<MenuItem key={option.value} value={option.value}>
					{option.label}
				</MenuItem>
			))}
		</StyledSelect>
		{helperText && <FormHelperText>{helperText}</FormHelperText>}
	</FormControl>
);
