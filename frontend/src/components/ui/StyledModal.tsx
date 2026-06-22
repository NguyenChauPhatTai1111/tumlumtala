import {
	Box,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	type DialogProps,
	DialogTitle,
	styled,
} from "@mui/material";
import type { ReactNode } from "react";

const StyledDialogRoot = styled(Dialog)(({ theme }) => ({
	"& .MuiDialog-paper": {
		borderRadius: "12px",
		boxShadow: theme.shadows[20],
		backdropFilter: "blur(4px)",
	},
}));

interface StyledModalProps
	extends Omit<DialogProps, "children" | "content" | "title"> {
	title: ReactNode;
	content?: ReactNode;
	actions?: ReactNode;
	children?: ReactNode;
	contentPadding?: number;
	actionSpacing?: number;
}

export const StyledModal = ({
	title,
	content,
	actions,
	children,
	contentPadding = 24,
	actionSpacing = 1,
	...props
}: StyledModalProps) => (
	<StyledDialogRoot {...props}>
		<DialogTitle sx={{ fontSize: "18px", fontWeight: 600 }}>
			{title}
		</DialogTitle>
		<DialogContent sx={{ py: contentPadding / 8, px: contentPadding / 8 }}>
			{children || content}
		</DialogContent>
		{actions && (
			<DialogActions sx={{ gap: actionSpacing, p: 2 }}>{actions}</DialogActions>
		)}
	</StyledDialogRoot>
);

// Variant: Confirmation Dialog
interface ConfirmModalProps extends Omit<DialogProps, "children"> {
	title: string;
	message: string;
	onConfirm: () => void;
	onCancel: () => void;
	confirmText?: string;
	cancelText?: string;
	isDangerous?: boolean;
}

export const ConfirmModal = ({
	title,
	message,
	onConfirm,
	onCancel,
	confirmText = "Confirm",
	cancelText = "Cancel",
	isDangerous = false,
	...props
}: ConfirmModalProps) => (
	<StyledModal
		title={title}
		content={<DialogContentText>{message}</DialogContentText>}
		{...props}
	>
		<DialogContentText>{message}</DialogContentText>
	</StyledModal>
);

// Variant: Modal Box Wrapper
export const ModalBox = styled(Box)(({ theme }) => ({
	padding: theme.spacing(3),
	borderRadius: "12px",
	backgroundColor: theme.palette.background.paper,
	boxShadow: theme.shadows[8],
}));

// Centered Modal Content
export const CenteredModal = styled(Box)(({ theme }) => ({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	gap: theme.spacing(2),
	textAlign: "center",
}));
