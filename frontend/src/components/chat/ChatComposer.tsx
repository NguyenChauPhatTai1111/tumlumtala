import SendIcon from "@mui/icons-material/Send";
import { Box, IconButton, TextField } from "@mui/material";
import { useEffect, useRef, useState } from "react";

interface ChatComposerProps {
	disabled?: boolean;
	onSend: (text: string) => void;
}

export const ChatComposer = ({ disabled, onSend }: ChatComposerProps) => {
	const [text, setText] = useState("");
	const inputRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		if (!disabled) {
			inputRef.current?.focus();
		}
	}, [disabled]);

	const handleSend = () => {
		const trimmed = text.trim();
		if (!trimmed || disabled) return;
		onSend(trimmed);
		setText("");
	};

	return (
		<Box
			sx={{
				p: 1.5,
				borderTop: "1px solid",
				borderColor: "divider",
				display: "flex",
				gap: 1,
				alignItems: "flex-end",
				bgcolor: disabled ? "action.disabledBackground" : "background.paper",
				transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
			}}
		>
			<TextField
				fullWidth
				multiline
				minRows={1}
				maxRows={4}
				placeholder="Nhập tin nhắn..."
				value={text}
				onChange={(event) => setText(event.target.value)}
				inputRef={inputRef}
				onKeyDown={(event) => {
					if (event.key === "Enter" && !event.shiftKey && !disabled) {
						event.preventDefault();
						handleSend();
					}
				}}
				disabled={disabled}
				slotProps={{
					input: {
						sx: {
							opacity: disabled ? 0.6 : 1,
						},
					},
				}}
			/>
			<IconButton
				color="primary"
				onClick={handleSend}
				disabled={disabled || !text.trim()}
				sx={{
					opacity: disabled ? 0.5 : 1,
					transition: "opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)",
				}}
			>
				<SendIcon />
			</IconButton>
		</Box>
	);
};
