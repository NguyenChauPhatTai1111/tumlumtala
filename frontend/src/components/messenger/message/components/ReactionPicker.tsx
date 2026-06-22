import {
	getEmojiText,
	normalizeEmojiType,
} from "@components/messenger/composer/utils/emoji";
import type { ReactionPickerProps } from "@components/messenger/types/message-ui";
import { useMessengerEmoji } from "@context/MessengerEmojiContext";
import AddIcon from "@mui/icons-material/Add";
import { Box, IconButton, Popper, Tab, Tabs, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IEmoji } from "@/types/emoji";

export const REACTION_OPTIONS = ["❤️", "👍", "😂", "😮", "😢", "😡"];

export const ReactionPicker = ({
	myReactionEmoji,
	anchorEl,
	placement = "top",
	activeReactionBackground,
	reactionBorderColor,
	ambientTextColor,
	bubbleBackground,
	actionsSurfaceBackground,
	actionSurfaceShadow,
	hasCustomTheme,
	ambientBorderColor,
	pickerRef,
	onReactionSelect,
	onClose,
	onMouseEnter,
	onMouseLeave,
}: ReactionPickerProps) => {
	const [extraReactionOpen, setExtraReactionOpen] = useState(false);
	const [activeReactionPackTab, setActiveReactionPackTab] = useState("");
	const { emojiTypeGroups, emojiTypeMap } = useMessengerEmoji();
	const emojiListRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!extraReactionOpen) return;

		const viewport = document.querySelector<HTMLElement>(
			".message-list-viewport",
		);
		if (!viewport) return;

		const savedScrollTop = viewport.scrollTop;
		const savedOverflow = viewport.style.overflowY;
		const savedPaddingRight = viewport.style.paddingRight;
		const savedBoxSizing = viewport.style.boxSizing;
		const scrollbarWidth = viewport.offsetWidth - viewport.clientWidth;
		const computedPaddingRight =
			Number.parseFloat(getComputedStyle(viewport).paddingRight) || 0;

		if (scrollbarWidth > 0) {
			viewport.style.boxSizing = "border-box";
			viewport.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
		}
		viewport.style.overflowY = "hidden";
		// Giữ scroll position để tránh nhảy khi khóa
		viewport.scrollTop = savedScrollTop;

		return () => {
			viewport.style.overflowY = savedOverflow;
			viewport.style.paddingRight = savedPaddingRight;
			viewport.style.boxSizing = savedBoxSizing;
			viewport.scrollTop = savedScrollTop;
		};
	}, [extraReactionOpen]);

	const reactionEmojiTabs = useMemo(
		() =>
			Array.from(emojiTypeGroups.keys())
				.filter((type) => type !== "sticker")
				.map((type) => ({ key: type, label: emojiTypeMap[type] || type })),
		[emojiTypeGroups, emojiTypeMap],
	);

	const currentReactionPackTab =
		activeReactionPackTab || reactionEmojiTabs[0]?.key || "";

	const reactionEmojiList = useMemo(
		() => emojiTypeGroups.get(currentReactionPackTab) ?? [],
		[emojiTypeGroups, currentReactionPackTab],
	);

	const surfaceBg = hasCustomTheme
		? bubbleBackground
		: actionsSurfaceBackground;
	const messageListBoundary =
		typeof document === "undefined"
			? undefined
			: document.querySelector<HTMLElement>(".message-list-viewport");

	return (
		<>
			{extraReactionOpen && (
				<Box
					onClick={(event) => {
						event.stopPropagation();
						setExtraReactionOpen(false);
						onClose();
					}}
					sx={{
						position: "fixed",
						inset: 0,
						zIndex: 25,
						bgcolor: "rgba(0,0,0,0.12)",
						cursor: "default",
					}}
				/>
			)}

			<Popper
				open={Boolean(anchorEl)}
				anchorEl={anchorEl}
				placement={placement}
				modifiers={[
					{ name: "offset", options: { offset: [0, 8] } },
					{
						name: "preventOverflow",
						options: {
							padding: 8,
							boundary: messageListBoundary ?? "viewport",
						},
					},
					{
						name: "flip",
						options: {
							padding: 8,
							boundary: messageListBoundary ?? "viewport",
							fallbackPlacements: ["bottom", "top"],
						},
					},
				]}
				sx={{ zIndex: 1300 }}
			>
				<Box
					ref={pickerRef}
					className="reaction-picker-container"
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
					sx={{
						display: "flex",
						alignItems: "center",
						gap: 0.35,
						px: 0.6,
						py: 0.5,
						bgcolor: surfaceBg,
						border: "1px solid",
						borderColor: ambientBorderColor || "divider",
						borderRadius: 999,
						boxShadow: actionSurfaceShadow,
						animation: "reactionPickerFade 0.16s ease",
						"@keyframes reactionPickerFade": {
							from: { opacity: 0, transform: "translateY(6px) scale(0.94)" },
							to: { opacity: 1, transform: "translateY(0) scale(1)" },
						},
					}}
				>
					{REACTION_OPTIONS.map((emoji) => {
						const isSelectedEmoji = emoji === myReactionEmoji;
						return (
							<IconButton
								key={emoji}
								size="small"
								onClick={(event) => {
									event.stopPropagation();
									setExtraReactionOpen(false);
									onReactionSelect(emoji);
								}}
								sx={{
									width: 30,
									height: 30,
									flex: "0 0 30px",
									fontSize: 18,
									bgcolor: isSelectedEmoji
										? activeReactionBackground
										: "transparent",
									border: "1px solid",
									borderColor: isSelectedEmoji
										? reactionBorderColor
										: "transparent",
									transition: "all 0.15s ease",
									"&:hover": { transform: "translateY(-2px) scale(1.2)" },
								}}
							>
								{emoji}
							</IconButton>
						);
					})}

					{reactionEmojiTabs.length > 0 && (
						<IconButton
							size="small"
							onClick={(event) => {
								event.stopPropagation();
								setExtraReactionOpen((prev) => !prev);
							}}
							sx={{
								width: 30,
								height: 30,
								flex: "0 0 30px",
								fontSize: 16,
								color: ambientTextColor,
								bgcolor: extraReactionOpen
									? activeReactionBackground
									: "action.selected",
								border: "1px solid",
								borderColor: extraReactionOpen
									? reactionBorderColor
									: "transparent",
								transition: "all 0.15s ease",
								"&:hover": { transform: "translateY(-2px) scale(1.1)" },
							}}
						>
							<AddIcon fontSize="inherit" />
						</IconButton>
					)}

					{extraReactionOpen && (
						<Box
							onClick={(e) => e.stopPropagation()}
							sx={{
								position: "absolute",
								bottom: "calc(100% + 8px)",
								right: 0,
								transform: "translateY(0) scale(1)",
								width: 300,
								maxWidth: "calc(100vw - 16px)",
								maxHeight: "min(320px, calc(100vh - 112px))",
								bgcolor: surfaceBg,
								border: "1px solid",
								borderColor: ambientBorderColor || "divider",
								borderRadius: 2,
								boxShadow: actionSurfaceShadow,
								zIndex: 35,
								overflow: "hidden",
								animation: "extraReactionPickerDrop 0.16s ease",
								"@keyframes extraReactionPickerDrop": {
									from: {
										opacity: 0,
										transform: "translateY(-8px) scale(0.98)",
									},
									to: {
										opacity: 1,
										transform: "translateY(0) scale(1)",
									},
								},
							}}
						>
							<Tabs
								value={currentReactionPackTab}
								onChange={(_, value) => setActiveReactionPackTab(String(value))}
								variant="scrollable"
								scrollButtons="auto"
								allowScrollButtonsMobile
								sx={{
									minHeight: 36,
									borderBottom: "1px solid",
									borderColor: "divider",
									"& .MuiTab-root": {
										minHeight: 36,
										py: 0.5,
										px: 1.5,
										fontSize: 12,
										textTransform: "none",
									},
								}}
							>
								{reactionEmojiTabs.map((tab) => (
									<Tab key={tab.key} value={tab.key} label={tab.label} />
								))}
							</Tabs>

							<Box
								ref={emojiListRef}
								sx={{
									maxHeight: "min(220px, calc(100vh - 164px))",
									overflowY: "auto",
									p: 1,
									display: "flex",
									flexWrap: "wrap",
									gap: 0.5,
								}}
							>
								{reactionEmojiList.map((emoji: IEmoji) => {
									const value = getEmojiText(emoji);
									if (!value) return null;
									const isSelected = value === myReactionEmoji;
									const type = normalizeEmojiType(emoji.type);
									return (
										<IconButton
											key={emoji.id}
											size="small"
											onClick={(event) => {
												event.stopPropagation();
												setExtraReactionOpen(false);
												onReactionSelect(value);
											}}
											sx={{
												width: 34,
												height: 34,
												borderRadius: 1,
												bgcolor: isSelected
													? activeReactionBackground
													: "transparent",
												border: "1px solid",
												borderColor: isSelected
													? reactionBorderColor
													: "transparent",
												transition: "all 0.12s ease",
												"&:hover": {
													bgcolor: "action.hover",
													transform: "scale(1.15)",
												},
											}}
										>
											{type === "flag" ? (
												<Box
													component="span"
													className={`fi fi-${String(value).toLowerCase()}`}
													sx={{ fontSize: 18 }}
												/>
											) : (
												<Typography sx={{ fontSize: 20, lineHeight: 1 }}>
													{value}
												</Typography>
											)}
										</IconButton>
									);
								})}
							</Box>
						</Box>
					)}
				</Box>
			</Popper>
		</>
	);
};
