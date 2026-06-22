import {
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
} from "@mui/material";
import { type ReactNode, useRef } from "react";
import { useAutoFocusFirstInput } from "@/hooks/ui/useAutoFocusFirstInput";

export interface GenericFormDialogProps {
	open: boolean;
	title: string;
	onClose: () => void;
	onSubmit: () => void | Promise<void>;
	children: ReactNode;
	isLoading?: boolean;
	isSubmitting?: boolean;
	submitText?: string;
	cancelText?: string;
	formId?: string;
	maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
	closeOnSuccess?: boolean;
	showCancelButton?: boolean;
	showSubmitButton?: boolean;
}

/**
 * Generic FormDialog component
 * Replaces repetitive dialog wrappers with a single, reusable component
 */
export const GenericFormDialog = ({
	open,
	title,
	onClose,
	onSubmit,
	children,
	isLoading = false,
	isSubmitting = false,
	submitText = "Save",
	cancelText = "Cancel",
	formId,
	maxWidth = "md",
	closeOnSuccess = true,
	showCancelButton = true,
	showSubmitButton = true,
}: GenericFormDialogProps) => {
	const contentRef = useRef<HTMLDivElement | null>(null);
	useAutoFocusFirstInput(contentRef, open && !isLoading, [children]);

	const handleSubmit = async () => {
		try {
			await onSubmit?.();
			if (closeOnSuccess) {
				onClose();
			}
		} catch (error) {
			console.error("Form submission error:", error);
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
			<DialogTitle>{title}</DialogTitle>

			<DialogContent ref={contentRef} sx={{ paddingTop: "24px !important" }}>
				{isLoading ? (
					<Box display="flex" justifyContent="center" py={4}>
						<CircularProgress />
					</Box>
				) : (
					children
				)}
			</DialogContent>

			{(showCancelButton || showSubmitButton) && (
				<DialogActions>
					{showCancelButton && (
						<Button onClick={onClose} disabled={isSubmitting}>
							{cancelText}
						</Button>
					)}
					{showSubmitButton && (
						<Button
							variant="contained"
							type={formId ? "submit" : "button"}
							form={formId}
							onClick={!formId ? handleSubmit : undefined}
							disabled={isSubmitting || isLoading}
						>
							{isSubmitting ? <CircularProgress size={24} /> : submitText}
						</Button>
					)}
				</DialogActions>
			)}
		</Dialog>
	);
};
