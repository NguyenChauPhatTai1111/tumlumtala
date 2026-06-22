import CloseIcon from "@mui/icons-material/Close";
import {
	Box,
	Dialog,
	DialogContent,
	DialogTitle,
	IconButton,
	Stack,
	Typography,
} from "@mui/material";
import type { MessageHistory } from "@/types/messenger";
import { formatTimestampV2 } from "@/utils";

type MessageHistoryDialogProps = {
	open: boolean;
	histories: MessageHistory[];
	onClose: () => void;
};

export const MessageHistoryDialog = ({
	open,
	histories,
	onClose,
}: MessageHistoryDialogProps) => (
	<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
		<DialogTitle
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				pr: 1,
			}}
		>
			<Typography variant="h6">Lịch sử chỉnh sửa</Typography>

			<IconButton
				onClick={onClose}
				size="small"
				sx={{
					border: "1px solid",
					borderColor: "divider",
				}}
			>
				<CloseIcon fontSize="small" />
			</IconButton>
		</DialogTitle>

		<DialogContent dividers>
			{histories.length === 0 ? (
				<Typography variant="body2" color="text.secondary">
					Không có lịch sử chỉnh sửa
				</Typography>
			) : (
				<Stack spacing={1.5}>
					{histories.map((history) => (
						<Box
							key={history.id}
							sx={{
								p: 1.5,
								borderRadius: 2,
								border: "1px solid",
								borderColor: "divider",
								bgcolor: "background.paper",
							}}
						>
							<Typography
								variant="body2"
								sx={{
									whiteSpace: "pre-wrap",
									wordBreak: "break-word",
								}}
							>
								{history.content}
							</Typography>

							<Typography
								variant="caption"
								color="text.secondary"
								sx={{
									display: "block",
									mt: 1,
								}}
							>
								{history.edited_at ? formatTimestampV2(history.edited_at) : ""}
							</Typography>
						</Box>
					))}
				</Stack>
			)}
		</DialogContent>
	</Dialog>
);
