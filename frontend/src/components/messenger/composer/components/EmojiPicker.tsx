import {
	getEmojiText,
	normalizeEmojiType,
} from "@components/messenger/composer/utils/emoji";
import {
	Box,
	Chip,
	CircularProgress,
	Tab,
	Tabs,
	Typography,
} from "@mui/material";
import { resolveCdnUrl } from "@/utils";
import "flag-icons/css/flag-icons.min.css";
import type { EmojiTypeTab } from "@components/messenger/composer/types";
import type { MutableRefObject } from "react";
import type { IEmoji } from "@/types/emoji";

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
		<Box sx={{ width: 1 }}>
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
					sx={{ mb: 1 }}
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
					display: "flex",
					flexDirection: "column",
					gap: 2,
					maxHeight: 330,
					overflowY: "auto",
					pr: 1,
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

									return (
										<Chip
											key={item.id}
											clickable
											onClick={() => onPickEmoji(item)}
											label={
												assetUrl &&
												normalizeEmojiType(item.type) === "sticker" ? (
													<Box
														component="img"
														src={assetUrl}
														alt={item.name || item.code}
														sx={{ width: 38, height: 38, objectFit: "contain" }}
													/>
												) : normalizeEmojiType(item.type) === "flag" ? (
													<Box
														component="span"
														className={`fi fi-${String(textLabel).toLowerCase()}`}
														sx={{ fontSize: 18, lineHeight: 1 }}
													/>
												) : (
													<Typography sx={{ fontSize: 24, lineHeight: 1 }}>
														{textLabel}
													</Typography>
												)
											}
											sx={{
												height: 46,
												minWidth: 46,
												borderRadius: 1.5,
												backgroundColor: "transparent",
												justifyContent: "center",
												fontSize: 20,
												p: 0,
											}}
										/>
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
