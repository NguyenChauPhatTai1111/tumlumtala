import { useMessengerEmoji } from "@context/MessengerEmojiContext";
import { Box, Button, Grid, Tab, Tabs, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import type { IEmoji } from "@/types/emoji";
import { resolveCdnUrl } from "@/utils/urlUtils";

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

const extractFlagCode = (item: IEmoji): string => {
	const raw = String(
		item.icon_text ?? item.icon_code ?? item.source_value ?? item.code ?? "",
	).trim();
	const match = raw.match(/[a-zA-Z]{2}$/);
	return match ? match[0].toLowerCase() : raw.toLowerCase();
};

const isFlag = (item: IEmoji) =>
	normalizeEmojiType(item.type) === "flag" ||
	normalizeEmojiType(item.source_type) === "flag";

const getEmojiText = (item: IEmoji) => {
	if (isFlag(item)) {
		return extractFlagCode(item);
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
		return Array.from(emojiTypeGroups.keys())
			.filter((type) =>
				(emojiTypeGroups.get(type) ?? []).some(
					(item) => normalizeEmojiType(item.type) !== "sticker",
				),
			)
			.map((type) => ({
				key: type,
				label: emojiTypeMap[type] || type,
			}));
	}, [emojiTypeGroups, emojiTypeMap]);

	const [activeEmojiPack, setActiveEmojiPack] = useState("");
	const currentPack = activeEmojiPack || emojiTypeTabs[0]?.key || "";
	const displayedEmojis = (emojiTypeGroups.get(currentPack) ?? []).filter(
		(item) => normalizeEmojiType(item.type) !== "sticker",
	);

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
											) : isFlag(emoji) ? (
												<Box
													component="img"
													src={`/flags/4x3/${String(value).toLowerCase()}.svg`}
													alt={emoji.name || String(value)}
													sx={{ width: 24, height: 18, objectFit: "contain" }}
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
