import type { ComposerInputProps } from "@components/messenger/types/components";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import SendIcon from "@mui/icons-material/Send";
import { Box, IconButton, TextField, Tooltip } from "@mui/material";
import type { ChangeEvent } from "react";

export const ComposerInput = ({
	disabled,
	text,
	inputRef,
	outgoingTextColor,
	onTextChange,
	onSend,
	onOpenEmoji,
	onSelectImages,
	onSelectVideo,
	onSelectFile,
	onPaste,
	isCanSend,
	quickReaction,
	onQuickEmoji,
}: ComposerInputProps) => {
	const handleMediaSelect = (e: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		if (!files.length) return;

		const imageFiles = files.filter((f) => f.type.startsWith("image/"));
		const videoFiles = files.filter((f) => f.type.startsWith("video/"));
		const otherFiles = files.filter(
			(f) => !f.type.startsWith("image/") && !f.type.startsWith("video/"),
		);

		if (imageFiles.length > 0) {
			const dt = new DataTransfer();
			for (const f of imageFiles) dt.items.add(f);
			onSelectImages({
				target: { files: dt.files, value: "" },
			} as unknown as ChangeEvent<HTMLInputElement>);
		}

		if (videoFiles.length > 0) {
			const dt = new DataTransfer();
			for (const f of videoFiles) dt.items.add(f);
			onSelectVideo({
				target: { files: dt.files, value: "" },
			} as unknown as ChangeEvent<HTMLInputElement>);
		}

		if (otherFiles.length > 0) {
			const dt = new DataTransfer();
			for (const f of otherFiles) dt.items.add(f);
			onSelectFile({
				target: { files: dt.files, value: "" },
			} as unknown as ChangeEvent<HTMLInputElement>);
		}

		e.target.value = "";
	};

	return (
		<Box
			sx={{ width: "100%", display: "flex", gap: 1, alignItems: "flex-end" }}
		>
			<Tooltip title="Biểu cảm">
				<IconButton
					onClick={onOpenEmoji}
					disabled={disabled}
					sx={(theme) => ({
						color: outgoingTextColor || theme.palette.primary.main,
					})}
				>
					<EmojiEmotionsOutlinedIcon />
				</IconButton>
			</Tooltip>

			<Tooltip title="Đính kèm">
				<IconButton
					component="label"
					disabled={disabled}
					sx={(theme) => ({
						color: outgoingTextColor || theme.palette.primary.main,
					})}
				>
					<AttachFileIcon />
					<input
						multiple
						hidden
						type="file"
						accept="image/png, image/jpeg, image/gif, image/webp, image/jpg, video/mp4, video/webm, video/ogg, video/quicktime, .pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z,.csv,.json,.xml"
						onChange={handleMediaSelect}
					/>
				</IconButton>
			</Tooltip>

			<Box
				sx={{
					flex: 1,
					border: "1px solid",
					borderColor: outgoingTextColor || "divider",
					borderRadius: 3,
					px: 1.5,
					py: 1,
				}}
			>
				<TextField
					variant="standard"
					fullWidth
					multiline
					maxRows={6}
					placeholder="Nhập tin nhắn..."
					value={text}
					onChange={(event) => onTextChange(event.target.value)}
					onPaste={onPaste}
					onKeyDown={(event) => {
						if (event.key === "Enter" && !event.shiftKey && !disabled) {
							event.preventDefault();
							onSend();
						}
					}}
					InputProps={{
						disableUnderline: true,
						inputRef,
					}}
					inputProps={{
						"data-messenger-composer-input": "true",
					}}
					sx={(theme) => ({
						"& .MuiInputBase-input": {
							color: outgoingTextColor || theme.palette.text.primary,
							resize: "none",
							"&::placeholder": {
								color: outgoingTextColor || theme.palette.text.primary,
								opacity: 0.7,
							},
						},
					})}
				/>
			</Box>

			<IconButton
				onClick={isCanSend ? onSend : onQuickEmoji}
				sx={(theme) => ({
					color: outgoingTextColor || theme.palette.primary.main,
				})}
			>
				{isCanSend ? <SendIcon /> : quickReaction || "👍"}
			</IconButton>
		</Box>
	);
};
