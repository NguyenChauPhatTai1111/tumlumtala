import { Button, type ButtonProps, styled } from "@mui/material";

const StyledButtonRoot = styled(Button)(({ theme }) => ({
	textTransform: "none",
	fontWeight: 500,
	borderRadius: "8px",
	padding: "8px 16px",
	fontSize: "14px",
	transition: theme.transitions.create([
		"background-color",
		"border-color",
		"color",
		"box-shadow",
	]),
	"&:hover": {
		boxShadow: theme.shadows[4],
	},
	"&:disabled": {
		opacity: 0.6,
	},
}));

export const StyledButton = (props: ButtonProps) => (
	<StyledButtonRoot {...props} />
);

// Variant: Primary (default)
export const PrimaryButton = (props: ButtonProps) => (
	<StyledButton variant="contained" color="primary" {...props} />
);

// Variant: Secondary
export const SecondaryButton = (props: ButtonProps) => (
	<StyledButton variant="outlined" color="primary" {...props} />
);

// Variant: Danger
export const DangerButton = (props: ButtonProps) => (
	<StyledButtonRoot
		variant="contained"
		sx={{
			backgroundColor: (theme) => theme.palette.error.main,
			color: "white",
			"&:hover": {
				backgroundColor: (theme) => theme.palette.error.dark,
			},
		}}
		{...props}
	/>
);

// Variant: Success
export const SuccessButton = (props: ButtonProps) => (
	<StyledButtonRoot
		variant="contained"
		sx={{
			backgroundColor: (theme) => theme.palette.success.main,
			color: "white",
			"&:hover": {
				backgroundColor: (theme) => theme.palette.success.dark,
			},
		}}
		{...props}
	/>
);

// Variant: Text
export const TextButton = (props: ButtonProps) => (
	<StyledButton variant="text" color="primary" {...props} />
);

// Variant: Small
export const SmallButton = (props: ButtonProps) => (
	<StyledButton size="small" {...props} />
);

// Variant: Large
export const LargeButton = (props: ButtonProps) => (
	<StyledButton size="large" {...props} />
);
