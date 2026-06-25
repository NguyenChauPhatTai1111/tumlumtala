import type { ComposerTab } from "@components/messenger/composer/types";
import { Box, Popover, Tab, Tabs } from "@mui/material";
import type { IEmoji } from "@/types/emoji";
import type { ISticker, IStickerPack } from "@/types/sticker";
import { EmojiPicker } from "./EmojiPicker";
import { StickerPicker } from "./StickerPicker";

type PickerPopoverProps = {
	open: boolean;
	anchorEl: HTMLElement | null;
	activeTab: ComposerTab;
	loadingEmojis: boolean;
	emojiError?: string | null;
	emojiTypeTabs: { key: string; label: string }[];
	effectiveActiveEmojiCategoryTab: string;
	emojiTypeMap: Record<string, string>;
	recentEmojiItems: IEmoji[];
	emojiTypeGroups: Map<string, IEmoji[]>;
	emojiScrollContainerRef: React.RefObject<HTMLDivElement | null>;
	categorySectionRefs: React.RefObject<Record<string, HTMLDivElement | null>>;
	loadingStickers: boolean;
	stickerPacks: IStickerPack[];
	activeStickerPackTab: string;
	displayedStickers: ISticker[];
	onClose: () => void;
	onTabChange: (newTab: ComposerTab) => Promise<void>;
	onPickEmoji: (item: IEmoji) => Promise<void>;
	onPickSticker: (sticker: ISticker) => Promise<void>;
	setActiveEmojiCategoryTab: (tab: string) => void;
	scrollToEmojiCategory: (key: string) => void;
	setActiveStickerPackTab: (tab: string) => void;
};

export const PickerPopover = ({
	open,
	anchorEl,
	activeTab,
	loadingEmojis,
	emojiError,
	emojiTypeTabs,
	effectiveActiveEmojiCategoryTab,
	emojiTypeMap,
	recentEmojiItems,
	emojiTypeGroups,
	emojiScrollContainerRef,
	categorySectionRefs,
	loadingStickers,
	stickerPacks,
	activeStickerPackTab,
	displayedStickers,
	onClose,
	onTabChange,
	onPickEmoji,
	onPickSticker,
	setActiveEmojiCategoryTab,
	scrollToEmojiCategory,
	setActiveStickerPackTab,
}: PickerPopoverProps) => (
	<Popover
		open={open}
		anchorEl={anchorEl}
		onClose={onClose}
		anchorOrigin={{ vertical: "top", horizontal: "center" }}
		transformOrigin={{ vertical: "bottom", horizontal: "center" }}
		slotProps={{
			paper: {
				sx: {
					borderRadius: 3,
					p: 0,
					minWidth: 560,
					maxWidth: 560,
					overflow: "hidden",
					bgcolor: "background.paper",
					boxShadow: "0 18px 48px rgba(15,23,42,0.18)",
				},
			},
		}}
	>
		<Box
			sx={{
				display: "flex",
				flexDirection: "column",
				width: 1,
				border: "1px solid",
				borderColor: "divider",
			}}
		>
			<Tabs
				value={activeTab}
				onChange={async (_, newValue) => {
					await onTabChange(newValue as ComposerTab);
				}}
				variant="fullWidth"
				sx={{ borderBottom: 1, borderColor: "divider" }}
			>
				<Tab value="emoji" label="Emoji" />
				<Tab value="sticker" label="Sticker" />
			</Tabs>

			<Box sx={{ p: 1.25, minHeight: 220 }}>
				{activeTab === "emoji" ? (
					<EmojiPicker
						loadingEmojis={loadingEmojis}
						emojiError={emojiError ?? null}
						emojiTypeTabs={emojiTypeTabs}
						effectiveActiveEmojiCategoryTab={effectiveActiveEmojiCategoryTab}
						setActiveEmojiCategoryTab={setActiveEmojiCategoryTab}
						emojiTypeMap={emojiTypeMap}
						recentEmojiItems={recentEmojiItems}
						emojiTypeGroups={emojiTypeGroups}
						emojiScrollContainerRef={emojiScrollContainerRef}
						categorySectionRefs={categorySectionRefs}
						scrollToEmojiCategory={scrollToEmojiCategory}
						onPickEmoji={onPickEmoji}
					/>
				) : (
					<StickerPicker
						loadingStickers={loadingStickers}
						stickerPacks={stickerPacks}
						activeStickerPackTab={activeStickerPackTab}
						setActiveStickerPackTab={setActiveStickerPackTab}
						displayedStickers={displayedStickers}
						onPickSticker={onPickSticker}
					/>
				)}
			</Box>
		</Box>
	</Popover>
);
