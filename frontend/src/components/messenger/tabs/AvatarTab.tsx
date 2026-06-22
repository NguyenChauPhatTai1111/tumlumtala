import { buildGeneratedAvatar } from "@components/messenger/messengerUtils";
import { Avatar, Box, Button, Typography } from "@mui/material";
import type React from "react";
import { resolveCdnUrl } from "@/utils";

type AvatarTabProps = {
	avatarPreviewUrl: string;
	conversationAvatar?: string;
	conversationName?: string;
	avatarFile: File | null;
	avatarInputRef: React.RefObject<HTMLInputElement | null>;
	onAvatarFileSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onClearAvatar: () => void;
	onCancel: () => void;
	onSave: () => void;
};

export default function AvatarTab({
	avatarPreviewUrl,
	conversationAvatar,
	conversationName,
	avatarFile,
	avatarInputRef,
	onAvatarFileSelected,
	onClearAvatar,
	onCancel,
	onSave,
}: AvatarTabProps) {
	const currentAvatarUrl =
		avatarPreviewUrl ||
		resolveCdnUrl(conversationAvatar) ||
		buildGeneratedAvatar(conversationName || "U");

	return (
		<>
			<Box
				sx={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: 2,
				}}
			>
				<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
					<Avatar src={currentAvatarUrl} sx={{ width: 100, height: 100 }} />
				</Box>
				<Box>
					{avatarFile ? (
						<Typography variant="body2" color="text.secondary">
							Ảnh mới đã chọn
						</Typography>
					) : (
						<Typography variant="body2">Ảnh đại diện hiện tại</Typography>
					)}
				</Box>

				<input
					ref={avatarInputRef}
					type="file"
					accept="image/*"
					hidden
					onChange={onAvatarFileSelected}
				/>

				<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
					<Button
						variant="outlined"
						onClick={() => avatarInputRef.current?.click()}
					>
						Chọn hình từ máy
					</Button>
					{avatarFile ? (
						<Button color="error" variant="outlined" onClick={onClearAvatar}>
							Xóa
						</Button>
					) : null}
				</Box>
			</Box>
			<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}>
				<Button onClick={onCancel}>Hủy</Button>
				<Button variant="contained" onClick={onSave} disabled={!avatarFile}>
					Lưu
				</Button>
			</Box>
		</>
	);
}
