import { Box, Button, TextField, Typography } from "@mui/material";

type RenameTabProps = {
	renameValue: string;
	onRenameValueChange: (value: string) => void;
	onCancel: () => void;
	onSave: () => void;
	disabled: boolean;
};

export default function RenameTab({
	renameValue,
	onRenameValueChange,
	onCancel,
	onSave,
	disabled,
}: RenameTabProps) {
	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Typography variant="body2" color="text.secondary">
				Đổi tên nhóm trò chuyện
			</Typography>

			<TextField
				autoFocus
				label="Tên nhóm"
				fullWidth
				value={renameValue}
				onChange={(event) => onRenameValueChange(event.target.value)}
			/>

			<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}>
				<Button onClick={onCancel}>Hủy</Button>
				<Button variant="contained" onClick={onSave} disabled={disabled}>
					Lưu
				</Button>
			</Box>
		</Box>
	);
}
