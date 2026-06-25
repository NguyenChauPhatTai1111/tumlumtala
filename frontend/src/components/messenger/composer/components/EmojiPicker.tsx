import type { EmojiTypeTab } from "@components/messenger/composer/types";
import {
	getEmojiText,
	isFlagEmoji,
	normalizeEmojiType,
} from "@components/messenger/composer/utils/emoji";
import { Box, CircularProgress, Tab, Tabs, Typography } from "@mui/material";
import type { MutableRefObject } from "react";
import type { IEmoji } from "@/types/emoji";
import { resolveCdnUrl } from "@/utils";

type EmojiPickerProps = {
	loadingEmojis: boolean;
	emojiError: string | null;
	emojiTypeTabs: EmojiTypeTab[];
	effectiveActiveEmojiCategoryTab: string;
	setActiveEmojiCategoryTab: (value: string) => void;
	emojiTypeMap: Record<string, string>;
	recentEmojiItems: IEmoji[];
	emojiTypeGroups: Map<string, IEmoji[]>;
	emojiScrollContainerRef: MutableRefObject<HTMLDivElement | null>;
	categorySectionRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
	scrollToEmojiCategory: (categoryKey: string) => void;
	onPickEmoji: (item: IEmoji) => void;
};

export const EmojiPicker = ({
	loadingEmojis,
	emojiError,
	emojiTypeTabs,
	effectiveActiveEmojiCategoryTab,
	setActiveEmojiCategoryTab,
	emojiTypeMap,
	recentEmojiItems,
	emojiTypeGroups,
	emojiScrollContainerRef,
	categorySectionRefs,
	scrollToEmojiCategory,
	onPickEmoji,
}: EmojiPickerProps) => {
	if (loadingEmojis) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
				<CircularProgress size={24} />
			</Box>
		);
	}

	if (emojiError) {
		return (
			<Typography
				variant="body2"
				color="error"
				sx={{ textAlign: "center", py: 3 }}
			>
				{emojiError}
			</Typography>
		);
	}

	return (
		<Box
			sx={{
				width: 1,
				display: "flex",
				flexDirection: "column",
				maxHeight: 380,
				minHeight: 0,
			}}
		>
			{emojiTypeTabs.length > 0 && (
				<Tabs
					value={effectiveActiveEmojiCategoryTab}
					onChange={(_, value) => {
						const newCategory = String(value);
						setActiveEmojiCategoryTab(newCategory);
						scrollToEmojiCategory(newCategory);
					}}
					variant="scrollable"
					scrollButtons="auto"
					allowScrollButtonsMobile
					sx={{ mb: 1, flexShrink: 0 }}
				>
					{emojiTypeTabs.map((tab) => (
						<Tab
							key={tab.key}
							value={tab.key}
							label={tab.label}
							sx={{ textTransform: "none" }}
						/>
					))}
				</Tabs>
			)}

			<Box
				ref={emojiScrollContainerRef}
				sx={{
					flex: 1,
					overflowY: "auto",
					display: "flex",
					flexDirection: "column",
					gap: 2,
				}}
			>
				{emojiTypeTabs.map((tab) => {
					const type = tab.key;
					const items =
						type === "recently_used"
							? recentEmojiItems
							: (emojiTypeGroups.get(type) ?? []);

					if (items.length === 0) {
						return null;
					}

					return (
						<Box
							key={type}
							ref={(node: HTMLDivElement | null) => {
								categorySectionRefs.current[type] = node;
							}}
						>
							<Typography
								variant="subtitle2"
								sx={{ fontWeight: 700, mb: 1, mt: 2 }}
							>
								{type === "recently_used"
									? "Gần đây"
									: emojiTypeMap[type] || type}
							</Typography>
							<Box
								sx={{
									display: "grid",
									gap: 1,
									gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
								}}
							>
								{items.map((item) => {
									const assetUrl = resolveCdnUrl(
										item.asset_url ??
											item.display_value ??
											item.source_value ??
											undefined,
									);
									const textLabel = getEmojiText(item) || item.code || "";
									const isFlag = isFlagEmoji(item);
									const isSticker =
										assetUrl && normalizeEmojiType(item.type) === "sticker";

									return (
										<Box
											key={item.id}
											component="button"
											type="button"
											onClick={() => onPickEmoji(item)}
											sx={{
												height: 46,
												minWidth: 46,
												borderRadius: 1.5,
												border: "none",
												backgroundColor: "transparent",
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												p: 0,
												"&:hover": { bgcolor: "action.hover" },
											}}
										>
											{isSticker ? (
												<Box
													component="img"
													src={assetUrl}
													alt={item.name || item.code}
													sx={{ width: 38, height: 38, objectFit: "contain" }}
												/>
											) : isFlag ? (
												<Box
													component="img"
													src={`/flags/4x3/${String(textLabel).toLowerCase()}.svg`}
													alt={item.name || String(textLabel)}
													sx={{ width: 28, height: 21, objectFit: "contain" }}
												/>
											) : (
												<Typography sx={{ fontSize: 24, lineHeight: 1 }}>
													{textLabel}
												</Typography>
											)}
										</Box>
									);
								})}
							</Box>
						</Box>
					);
				})}
			</Box>
		</Box>
	);
};
