import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
} from "@mui/material";
import { type ReactNode, useRef } from "react";
import { useAutoFocusFirstInput } from "@/hooks/ui/useAutoFocusFirstInput";

type BaseDialogProps = {
	open: boolean;
	title: string;
	onClose: () => void;
	children: ReactNode;

	submitText?: string;
	loading?: boolean;

	formId?: string;
	onSubmit?: () => void;
	maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
};

export const BaseDialog = ({
	open,
	title,
	onClose,
	children,
	submitText = "Lưu",
	loading = false,
	formId,
	onSubmit,
}: BaseDialogProps) => {
	const contentRef = useRef<HTMLDivElement | null>(null);
	useAutoFocusFirstInput(contentRef, open, [children]);

	return (
		<Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
			<DialogTitle>{title}</DialogTitle>

			<DialogContent ref={contentRef}>{children}</DialogContent>

			<DialogActions>
				<Button onClick={onClose}>Hủy</Button>

				{formId ? (
					<Button
						variant="contained"
						type="submit"
						form={formId}
						disabled={loading}
					>
						{loading ? "Đang lưu..." : submitText}
					</Button>
				) : (
					<Button variant="contained" onClick={onSubmit} disabled={loading}>
						{submitText}
					</Button>
				)}
			</DialogActions>
		</Dialog>
	);
};
