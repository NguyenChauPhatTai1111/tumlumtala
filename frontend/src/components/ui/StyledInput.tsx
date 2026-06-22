import { styled, TextField, type TextFieldProps } from "@mui/material";

export const StyledInput = styled(TextField)(({ theme }) => ({
	"& .MuiOutlinedInput-root": {
		borderRadius: "8px",
		transition: theme.transitions.create([
			"border-color",
			"box-shadow",
			"background-color",
		]),
		"&:hover fieldset": {
			borderColor: theme.palette.primary.main,
		},
		"&.Mui-focused fieldset": {
			borderWidth: 1,
			boxShadow: `0 0 0 3px ${theme.palette.primary.light}40`,
		},
	},
	"& .MuiOutlinedInput-input": {
		padding: "12px 14px",
		fontSize: "14px",
		"&::placeholder": {
			opacity: 0.6,
		},
	},
	"& .MuiFormLabel-root": {
		fontSize: "14px",
		transform: "translate(14px, -9px)",
		color: theme.palette.text.secondary,
		"&.Mui-focused": {
			color: theme.palette.primary.main,
		},
	},
}));

// Variant: Filled background
export const FilledInput = styled(TextField)(({ theme }) => ({
	"& .MuiOutlinedInput-root": {
		borderRadius: "8px",
		backgroundColor: theme.palette.action.hover,
		"&:hover": {
			backgroundColor: theme.palette.action.selected,
		},
		"&.Mui-focused": {
			backgroundColor: "transparent",
		},
	},
}));

// Variant: Dense
export const DenseInput = styled(TextField)(() => ({
	"& .MuiOutlinedInput-root": {
		borderRadius: "6px",
	},
	"& .MuiOutlinedInput-input": {
		padding: "8px 12px",
		fontSize: "13px",
	},
}));

// Wrapper component
export const FormInput = (props: TextFieldProps) => (
	<StyledInput fullWidth variant="outlined" {...props} />
);

export const FormFilledInput = (props: TextFieldProps) => (
	<FilledInput fullWidth variant="outlined" {...props} />
);

export const FormDenseInput = (props: TextFieldProps) => (
	<DenseInput fullWidth variant="outlined" {...props} />
);
