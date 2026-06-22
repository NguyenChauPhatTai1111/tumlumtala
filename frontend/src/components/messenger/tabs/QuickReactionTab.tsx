import { useMessengerEmoji } from "@context/MessengerEmojiContext";
import { Box, Button, Grid, Tab, Tabs, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import type { IEmoji } from "@/types/emoji";
import { resolveCdnUrl } from "@/utils/urlUtils";

import "flag-icons/css/flag-icons.min.css";

type QuickReactionTabProps = {
	currentQuickReaction?: string;
	onCancel: () => void;
	onSave: (quickReaction: string) => Promise<void>;
	disabled?: boolean;
};

const normalizeEmojiType = (value: unknown) => {
	const normalized = String(value ?? "")
		.trim()
		.toLowerCase();

	return normalized === "" ? "other" : normalized;
};

const getEmojiText = (item: IEmoji) => {
	if (normalizeEmojiType(item.type) === "flag" && item.code) {
		return String(
			item.icon_text ?? item.icon_code ?? item.source_value ?? "",
		).trim();
	}

	const sourceType = String(item.source_type ?? "")
		.trim()
		.toLowerCase();

	const iconText = String(item.icon_text ?? item.icon_code ?? "").trim();

	const assetUrl = resolveCdnUrl(
		item.asset_url ?? item.display_value ?? item.source_value ?? undefined,
	);

	if (sourceType === "unicode_icon" && iconText) {
		return iconText;
	}

	if (iconText) {
		return iconText;
	}

	if (item.display_value?.trim()) {
		return item.display_value.trim();
	}

	if (item.code?.trim()) {
		return item.code.trim();
	}

	return assetUrl || "";
};

export default function QuickReactionTab({
	currentQuickReaction = "",
	onCancel,
	onSave,
	disabled = false,
}: QuickReactionTabProps) {
	const { emojiTypeMap, emojiTypeGroups, loading } = useMessengerEmoji();

	const [saving, setSaving] = useState(false);
	const [selectedEmoji, setSelectedEmoji] = useState(
		currentQuickReaction || "",
	);

	const emojiTypeTabs = useMemo(() => {
		return Array.from(emojiTypeGroups.keys()).map((type) => ({
			key: type,
			label: emojiTypeMap[type] || type,
		}));
	}, [emojiTypeGroups, emojiTypeMap]);

	const [activeEmojiPack, setActiveEmojiPack] = useState("");
	const currentPack = activeEmojiPack || emojiTypeTabs[0]?.key || "";
	const displayedEmojis = emojiTypeGroups.get(currentPack) ?? [];

	const handleSave = async () => {
		if (!selectedEmoji.trim()) {
			return;
		}

		setSaving(true);

		try {
			await onSave(selectedEmoji);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Box sx={{ px: 2 }}>
			<Typography
				variant="subtitle2"
				sx={{
					mb: 2,
					fontWeight: 600,
				}}
			>
				Chọn biểu cảm
			</Typography>

			{loading ? (
				<Typography color="text.secondary">Đang tải emoji...</Typography>
			) : (
				<>
					<Tabs
						value={currentPack}
						onChange={(_, value) => setActiveEmojiPack(String(value))}
						variant="scrollable"
						scrollButtons="auto"
						allowScrollButtonsMobile
						sx={{ mb: 2 }}
					>
						{emojiTypeTabs.map((tab) => (
							<Tab
								key={tab.key}
								value={tab.key}
								label={tab.label}
								sx={{
									textTransform: "none",
								}}
							/>
						))}
					</Tabs>

					<Box
						sx={{
							maxHeight: 400,
							overflowY: "auto",
							pr: 1,
						}}
					>
						<Grid container spacing={1}>
							{displayedEmojis.map((emoji) => {
								const value = getEmojiText(emoji);

								const assetUrl = resolveCdnUrl(
									emoji.asset_url ??
										emoji.display_value ??
										emoji.source_value ??
										undefined,
								);

								const isSelected = selectedEmoji === value;

								return (
									<Grid item xs="auto" key={emoji.id}>
										<Box
											onClick={() => {
												setSelectedEmoji(value);
											}}
											sx={{
												width: 48,
												height: 48,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												cursor: "pointer",
												borderRadius: 1.5,
												border: "1px solid",
												borderColor: isSelected
													? "primary.main"
													: "transparent",
												bgcolor: isSelected ? "action.selected" : "transparent",
												transition: "all .15s ease",
												"&:hover": {
													bgcolor: "action.hover",
												},
											}}
										>
											{assetUrl &&
											normalizeEmojiType(emoji.type) === "sticker" ? (
												<img
													src={assetUrl}
													alt={emoji.name}
													style={{
														width: 32,
														height: 32,
														objectFit: "contain",
													}}
												/>
											) : normalizeEmojiType(emoji.type) === "flag" ? (
												<Box
													component="span"
													className={`fi fi-${String(value).toLowerCase()}`}
													sx={{
														fontSize: 18,
													}}
												/>
											) : (
												<Typography
													sx={{
														fontSize: 28,
														lineHeight: 1,
													}}
												>
													{value}
												</Typography>
											)}
										</Box>
									</Grid>
								);
							})}
						</Grid>
					</Box>
				</>
			)}

			<Box
				sx={{
					display: "flex",
					justifyContent: "flex-end",
					gap: 1,
				}}
			>
				<Button onClick={onCancel} disabled={saving}>
					Hủy
				</Button>

				<Button
					variant="contained"
					onClick={handleSave}
					disabled={saving || disabled || !selectedEmoji.trim()}
				>
					Lưu
				</Button>
			</Box>
		</Box>
	);
}
