import type { MessageBubbleProps } from "@components/messenger/types/messages";
import { getReadableTextColor } from "@components/messenger/utils/color";
import { isMessageEdited } from "@components/messenger/utils/message";
import { alpha, Box } from "@mui/material";
import { useCurrentUser } from "@hooks/common/useCurrentUser";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { IUser } from "@/types";
import {
	BubbleContent,
	getBubbleBorderRadius,
	isEmojiOnly,
	isFlagMsg,
} from "./BubbleContent";
import { MessageActions } from "./MessageActions";
import { REACTION_OPTIONS, ReactionPicker } from "./ReactionPicker";

const HOVER_ACTION_DELAY_MS = 0;
const HOVER_LEAVE_DELAY_MS = 220;
const MAX_VISIBLE_REACTION_EMOJIS = 3;

export const MessageListBubble = ({
	message,
	isCurrentUserSender,
	isFirstInSenderGroup = true,
	isLastInSenderGroup = true,
	currentHasReaction = false,
	prevHasReaction = false,
	outgoingBubbleColor,
	incomingBubbleColor,
	outgoingTextColor,
	incomingTextColor,
	ambientTextColor,
	ambientBorderColor,
	isRowHovered = false,
	isContextMenuOpen,
	isHighlighted = false,
	isLastInConversation = false,
	replyMessage,
	replyPreviewSenderName,
	messages,
	onDeleteMessage,
	onEditMessage,
	onToggleReaction,
	onSpeakMessage,
	onReplyMessage,
	onJumpToMessage,
	onViewHistories,
	onContextMenuOpen,
}: MessageBubbleProps) => {
	const [hovered, setHovered] = useState(false);
	const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
	const [reactionPickerAnchorEl, setReactionPickerAnchorEl] =
		useState<HTMLElement | null>(null);
	const [actionsLocked, setActionsLocked] = useState(false);
	const [animatedReaction, setAnimatedReaction] = useState<{
		id: number;
		emoji: string;
	} | null>(null);
	const [suppressEditedLabel, setSuppressEditedLabel] = useState(false);
	const [reactionExceedsBubble, setReactionExceedsBubble] = useState(false);
	const isOverReactionPickerRef = useRef(false);
	const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const reactionAnimationTimeoutRef = useRef<ReturnType<
		typeof setTimeout
	> | null>(null);
	const suppressEditedLabelTimeoutRef = useRef<ReturnType<
		typeof setTimeout
	> | null>(null);
	const bubbleRef = useRef<HTMLDivElement | null>(null);
	const messageBubbleRef = useRef<HTMLDivElement | null>(null);
	const reactionGroupRef = useRef<HTMLDivElement | null>(null);
	const reactionTriggerRef = useRef<HTMLButtonElement | null>(null);
	const reactionPickerRef = useRef<HTMLDivElement | null>(null);
	const reactionAnimationIdRef = useRef(0);
	const { data: currentUser } = useCurrentUser();

	const myReactionEmoji = useMemo(() => {
		if (message.my_reaction) return message.my_reaction;
		return message.reactions?.find(
			(reaction) => String(reaction.user_id) === String(currentUser?.id),
		)?.emoji;
	}, [message.my_reaction, message.reactions, currentUser?.id]);

	const reactionSummary = useMemo(() => {
		const reactions = message.reactions ?? [];
		const uniqueEmojis: string[] = [];
		const seenEmoji = new Set<string>();

		for (const reaction of reactions) {
			if (!reaction?.emoji) continue;
			if (seenEmoji.has(reaction.emoji)) continue;
			seenEmoji.add(reaction.emoji);
			uniqueEmojis.push(reaction.emoji);
		}

		if (uniqueEmojis.length === 0 && message.my_reaction) {
			uniqueEmojis.push(message.my_reaction);
		}

		return {
			emojis: uniqueEmojis.slice(0, MAX_VISIBLE_REACTION_EMOJIS),
			total: Math.max(reactions.length, message.my_reaction ? 1 : 0),
		};
	}, [message.my_reaction, message.reactions]);

	const hasReactionSummary = reactionSummary.total > 0;

	const clearHoverTimeout = () => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
			hoverTimeoutRef.current = null;
		}
	};

	const handleHoverEnter = () => {
		clearHoverTimeout();
		if (actionsLocked) {
			setHovered(true);
			return;
		}
		if (hovered) return;
		hoverTimeoutRef.current = setTimeout(() => {
			setHovered(true);
			hoverTimeoutRef.current = null;
		}, HOVER_ACTION_DELAY_MS);
	};

	const handleHoverLeave = (
		event?: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>,
	) => {
		const relatedTarget = event?.relatedTarget;
		const nextTarget = relatedTarget instanceof Node ? relatedTarget : null;
		const isStillInsideBubble =
			nextTarget &&
			(bubbleRef.current?.contains(nextTarget) ||
				reactionPickerRef.current?.contains(nextTarget));

		if (isStillInsideBubble || isOverReactionPickerRef.current) return;

		if (reactionPickerOpen) {
			setReactionPickerOpen(false);
			setReactionPickerAnchorEl(null);
		}

		if (actionsLocked) return;
		clearHoverTimeout();
		hoverTimeoutRef.current = setTimeout(() => {
			setHovered(false);
			hoverTimeoutRef.current = null;
		}, HOVER_LEAVE_DELAY_MS);
	};

	const clearSuppressEditedLabelTimeout = useCallback(() => {
		if (suppressEditedLabelTimeoutRef.current) {
			clearTimeout(suppressEditedLabelTimeoutRef.current);
			suppressEditedLabelTimeoutRef.current = null;
		}
	}, []);

	useEffect(() => {
		return () => {
			if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
			if (reactionAnimationTimeoutRef.current)
				clearTimeout(reactionAnimationTimeoutRef.current);
			clearSuppressEditedLabelTimeout();
		};
	}, [clearSuppressEditedLabelTimeout]);

	useEffect(() => {
		if (!actionsLocked) return;
		const handleOutsideClick = (event: MouseEvent) => {
			const target = event.target as Node;
			if (bubbleRef.current?.contains(target)) return;
			setActionsLocked(false);
			setReactionPickerOpen(false);
			setReactionPickerAnchorEl(null);
			setHovered(false);
		};
		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, [actionsLocked]);

	const triggerSuppressEditedLabel = () => {
		setSuppressEditedLabel(true);
		clearSuppressEditedLabelTimeout();
		suppressEditedLabelTimeoutRef.current = setTimeout(() => {
			setSuppressEditedLabel(false);
			suppressEditedLabelTimeoutRef.current = null;
		}, 1200);
	};

	const handleToggleReaction = (
		reaction: string,
		action?: "toggle" | "remove",
	) => {
		triggerSuppressEditedLabel();
		onToggleReaction?.(message, reaction, action);
	};

	const handleReactionSelect = (reaction: string) => {
		const isRemovingCurrentReaction = Boolean(
			myReactionEmoji && myReactionEmoji === reaction,
		);
		if (!isRemovingCurrentReaction) {
			if (reactionAnimationTimeoutRef.current) {
				clearTimeout(reactionAnimationTimeoutRef.current);
			}
			reactionAnimationIdRef.current += 1;
			setAnimatedReaction({
				id: reactionAnimationIdRef.current,
				emoji: reaction,
			});
			reactionAnimationTimeoutRef.current = setTimeout(() => {
				setAnimatedReaction(null);
			}, 750);
		}
		handleToggleReaction(
			reaction,
			isRemovingCurrentReaction ? "remove" : undefined,
		);
		setReactionPickerOpen(false);
		setReactionPickerAnchorEl(null);
		setActionsLocked(false);
		setHovered(false);
	};

	const openReactionPicker = (
		event?: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>,
	) => {
		event?.stopPropagation();
		clearHoverTimeout();
		setHovered(true);
		setReactionPickerAnchorEl(
			reactionTriggerRef.current ?? event?.currentTarget ?? null,
		);
		setReactionPickerOpen(true);
	};

	const handleReactionTriggerClick = (event: React.MouseEvent) => {
		event.stopPropagation();
		handleReactionSelect(myReactionEmoji || "❤️");
	};

	const isActivityMessage = Boolean(message.activity_type);
	const { isFlagMessage } = isFlagMsg(message);
	const isEmojiOnlyMessage = isEmojiOnly(message, isFlagMessage);
	const isStickerMessage = message.message_type === "sticker";
	const isImageMessage = message.message_type === "image";
	const isVideoMessage = message.message_type === "video";
	const isFileMessage = message.message_type === "file";
	const isEmojiTypeMessage =
		String(message.message_type ?? "")
			.trim()
			.toLowerCase() === "emoji";
	const isStickerTypeMessage =
		String(message.message_type ?? "")
			.trim()
			.toLowerCase() === "sticker";

	const canEditMessage =
		isCurrentUserSender &&
		!isEmojiTypeMessage &&
		!isStickerTypeMessage &&
		!isImageMessage &&
		!isVideoMessage &&
		!isFileMessage &&
		!isFlagMessage;

	const _msgType = String(message.message_type ?? "")
		.trim()
		.toLowerCase();
	const canSpeak =
		!isActivityMessage &&
		!isEmojiTypeMessage &&
		!isStickerTypeMessage &&
		!isImageMessage &&
		!isVideoMessage &&
		!isFileMessage &&
		!isFlagMessage;

	const isPlainBubble =
		isStickerMessage ||
		isEmojiOnlyMessage ||
		isImageMessage ||
		isVideoMessage ||
		isFlagMessage;

	const showActions =
		!isActivityMessage &&
		(hovered || isRowHovered || actionsLocked) &&
		!reactionPickerOpen &&
		!isContextMenuOpen;
	const showReactionTrigger =
		!isActivityMessage &&
		(hovered || isRowHovered || actionsLocked || reactionPickerOpen);

	const hasCustomBubbleBackground = Boolean(
		isCurrentUserSender
			? outgoingBubbleColor?.trim()
			: incomingBubbleColor?.trim(),
	);
	const hasCustomTheme = Boolean(
		outgoingBubbleColor?.trim() || incomingBubbleColor?.trim(),
	);
	const bubbleBackground = isActivityMessage
		? "action.hover"
		: isCurrentUserSender
			? outgoingBubbleColor || "primary.main"
			: incomingBubbleColor || "background.paper";
	const bubbleTextColor = isActivityMessage
		? (ambientTextColor ?? "text.secondary")
		: isCurrentUserSender
			? outgoingTextColor ||
				(hasCustomBubbleBackground
					? getReadableTextColor(bubbleBackground)
					: "primary.contrastText")
			: incomingTextColor ||
				(hasCustomBubbleBackground
					? getReadableTextColor(bubbleBackground)
					: (ambientTextColor ?? "text.primary"));

	const actionButtonHoverBg = hasCustomTheme
		? bubbleBackground
		: "action.hover";
	const actionButtonHoverTextColor = hasCustomTheme
		? (isCurrentUserSender ? outgoingTextColor : incomingTextColor) ||
			getReadableTextColor(bubbleBackground)
		: (ambientTextColor ?? "text.secondary");
	const replyContainerBackground = !hasCustomBubbleBackground
		? "action.hover"
		: bubbleTextColor === "#f8fafc"
			? "rgba(255,255,255,0.14)"
			: "rgba(0,0,0,0.1)";
	const reactionBorderColor = ambientBorderColor || "divider";
	const activeReactionBackground = hasCustomBubbleBackground
		? bubbleTextColor === "#f8fafc"
			? "rgba(240, 5, 5, 0.2)"
			: "rgba(15,23,42,0.1)"
		: "action.selected";
	const hasCustomConversationBackground = Boolean(ambientTextColor);
	// Badge nền reaction: dùng surface riêng để luôn đọc được trên mọi background
	const reactionBadgeBg = hasCustomConversationBackground
		? ambientTextColor === "#f8fafc"
			? "rgba(15,23,42,0.72)"
			: "rgba(255,255,255,0.88)"
		: "background.paper";
	const reactionCountColor = hasCustomConversationBackground
		? ambientTextColor === "#f8fafc"
			? "rgba(248,250,252,0.9)"
			: "rgba(15,23,42,0.8)"
		: "text.secondary";
	const actionsSurfaceBackground = "background.paper";
	const actionsBoxShadow = hasCustomConversationBackground
		? "0 10px 30px rgba(0,0,0,0.14)"
		: undefined;
	const actionSurfaceShadow = "0 4px 10px rgba(15,23,42,0.12)";

	const edited = useMemo(() => {
		if (suppressEditedLabel) return false;
		return isMessageEdited(message);
	}, [message, suppressEditedLabel]);

	const bubbleBorderRadius = getBubbleBorderRadius(
		isCurrentUserSender,
		isFirstInSenderGroup,
		isLastInSenderGroup,
		currentHasReaction,
		prevHasReaction,
	);

	useLayoutEffect(() => {
		const shouldMeasureReactions = hasReactionSummary || showReactionTrigger;

		const measure = () => {
			if (!shouldMeasureReactions) {
				setReactionExceedsBubble((current) => (current ? false : current));
				return;
			}

			const bubbleWidth =
				messageBubbleRef.current?.getBoundingClientRect().width ?? 0;
			const reactionEl = reactionGroupRef.current;
			const reactionWidth = reactionEl
				? Math.max(
						reactionEl.scrollWidth,
						reactionEl.getBoundingClientRect().width,
					)
				: 0;

			const nextReactionExceedsBubble =
				bubbleWidth > 0 && reactionWidth > bubbleWidth + 1;

			setReactionExceedsBubble((current) =>
				current === nextReactionExceedsBubble
					? current
					: nextReactionExceedsBubble,
			);
		};

		const animationFrame = window.requestAnimationFrame(measure);
		const resizeObserver = new ResizeObserver(measure);

		if (messageBubbleRef.current) {
			resizeObserver.observe(messageBubbleRef.current);
		}
		if (reactionGroupRef.current) {
			resizeObserver.observe(reactionGroupRef.current);
		}
		window.addEventListener("resize", measure);

		return () => {
			window.cancelAnimationFrame(animationFrame);
			resizeObserver.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, [hasReactionSummary, showReactionTrigger]);

	const renderReactionTrigger = () => (
		<Box
			ref={reactionTriggerRef}
			component="button"
			type="button"
			onMouseEnter={openReactionPicker}
			onPointerEnter={openReactionPicker}
			onMouseMove={(event) => {
				if (!reactionPickerOpen) {
					openReactionPicker(event);
				}
			}}
			onClick={handleReactionTriggerClick}
			aria-label="Cảm xúc"
			sx={{
				width: 24,
				height: 24,
				flex: "0 0 24px",
				p: 0,
				border: "1px solid",
				borderColor: reactionBorderColor,
				borderRadius: 999,
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				color: myReactionEmoji
					? hasCustomTheme
						? outgoingTextColor
						: "error.main"
					: "text.disabled",
				bgcolor: myReactionEmoji
					? hasCustomTheme
						? alpha(outgoingBubbleColor ?? "#000", 0.18)
						: alpha("#f44336", 0.12)
					: reactionBadgeBg,
				cursor: "pointer",
				transition: "all 0.15s ease",
				"&:hover": {
					color: "error.main",
					bgcolor: alpha("#f44336", 0.14),
					borderColor: alpha("#f44336", 0.14),
				},
			}}
		>
			<Box component="span" sx={{ fontSize: 13, lineHeight: 1 }}>
				{myReactionEmoji || "❤️"}
			</Box>
		</Box>
	);

	return (
		<Box
			onMouseEnter={handleHoverEnter}
			onMouseLeave={handleHoverLeave}
			sx={{
				position: "relative",
				display: "inline-flex",
				flexDirection: isCurrentUserSender ? "row-reverse" : "row",
				alignItems: "center",
				gap: 0.75,
				minWidth: 0,
			}}
		>
			<Box
				ref={bubbleRef}
				onContextMenu={(e) => {
					if (isActivityMessage) return;
					e.preventDefault();
					e.stopPropagation();
					onContextMenuOpen?.({ top: e.clientY, left: e.clientX }, message);
				}}
				sx={{
					position: "relative",
					display: "inline-flex",
					alignItems: "center",
					minWidth: 0,
					flexShrink: 1,
					maxWidth: "min(480px, 65vw)",
				}}
			>
				{animatedReaction && (
					<Box
						key={animatedReaction.id}
						component="span"
						sx={{
							position: "absolute",
							bottom: "calc(100% - 10px)",
							...(isCurrentUserSender ? { right: 8 } : { left: 8 }),
							fontSize: 22,
							lineHeight: 1,
							pointerEvents: "none",
							zIndex: 4,
							animation: "messengerReactionPop 0.75s ease-out forwards",
							"@keyframes messengerReactionPop": {
								"0%": { opacity: 0, transform: "translateY(10px) scale(0.6)" },
								"30%": { opacity: 1, transform: "translateY(-4px) scale(1.1)" },
								"100%": { opacity: 0, transform: "translateY(-28px) scale(1)" },
							},
						}}
					>
						{animatedReaction.emoji}
					</Box>
				)}

				<Box
					ref={messageBubbleRef}
					sx={{
						minWidth: isEmojiOnlyMessage ? 56 : 0,
						width: "fit-content",
						maxWidth: "100%",
						px: !isPlainBubble ? 1.5 : 0,
						py: !isPlainBubble ? 1 : 0,
						...(!isPlainBubble ? bubbleBorderRadius : {}),
						bgcolor: isPlainBubble ? "transparent" : bubbleBackground,
						color: bubbleTextColor,
						position: "relative",
						overflow: "hidden",
						...(isHighlighted
							? {
									outline: "2px solid",
									outlineColor: "warning.main",
									outlineOffset: "2px",
									...(isPlainBubble ? { borderRadius: "12px" } : {}),
									animation:
										"messengerBubbleHighlightPulse 1.6s ease-out forwards",
									"@keyframes messengerBubbleHighlightPulse": {
										"0%": {
											outlineColor: "rgba(245, 158, 11, 0.9)",
											outlineOffset: "3px",
											transform: "scale(1.06)",
										},
										"40%": { transform: "scale(1.03)" },
										"60%": {
											outlineColor: "rgba(245, 158, 11, 0.45)",
											outlineOffset: "2px",
										},
										"100%": {
											outlineColor: "rgba(245, 158, 11, 0)",
											outlineOffset: "2px",
											transform: "scale(1)",
										},
									},
								}
							: {}),
					}}
				>
					<BubbleContent
						message={message}
						messages={messages || []}
						isCurrentUserSender={isCurrentUserSender}
						bubbleTextColor={bubbleTextColor}
						replyMessage={replyMessage}
						replyPreviewSenderName={replyPreviewSenderName}
						replyContainerBackground={replyContainerBackground}
						outgoingTextColor={outgoingTextColor}
						incomingTextColor={incomingTextColor}
						edited={edited}
						bubbleBorderRadius={bubbleBorderRadius}
						onJumpToMessage={onJumpToMessage}
						onToggleReaction={onToggleReaction}
						onViewHistories={onViewHistories}
					/>
				</Box>

				{hasReactionSummary ||
				showReactionTrigger ||
				(isLastInConversation &&
					!isCurrentUserSender &&
					!isEmojiTypeMessage &&
					!isStickerTypeMessage &&
					!isEmojiOnlyMessage) ? (
					<Box
						ref={reactionGroupRef}
						onMouseEnter={openReactionPicker}
						onPointerEnter={openReactionPicker}
						onMouseMove={(event) => {
							if (!reactionPickerOpen) {
								openReactionPicker(event);
							}
						}}
						sx={{
							position: "absolute",
							bottom: -13,
							...(isCurrentUserSender
								? reactionExceedsBubble
									? { right: 0 }
									: { left: 0 }
								: reactionExceedsBubble
									? { left: 0 }
									: { right: 0 }),
							display: "flex",
							alignItems: "center",
							gap: 0.35,
							maxWidth: "min(120px, calc(100vw - 32px))",
							overflow: "hidden",
							zIndex: 24,
						}}
					>
						{isCurrentUserSender && renderReactionTrigger()}
						{hasReactionSummary && (
							<Box
								sx={{
									height: 24,
									px: 0.6,
									minWidth: 0,
									maxWidth: "100%",
									flex: "1 1 auto",
									overflow: "hidden",
									borderRadius: 999,
									bgcolor: reactionBadgeBg,
									border: "1px solid",
									borderColor: reactionBorderColor,
									display: "flex",
									alignItems: "center",
									gap: 0.15,
								}}
							>
								{isCurrentUserSender && (
									<Box
										component="span"
										sx={{
											fontSize: 11,
											fontWeight: 600,
											lineHeight: 1,
											color: reactionCountColor,
											flex: "0 0 auto",
										}}
									>
										{reactionSummary.total}
									</Box>
								)}
								<Box
									sx={{
										display: "flex",
										alignItems: "center",
										gap: 0.15,
										minWidth: 0,
										overflow: "hidden",
									}}
								>
									{reactionSummary.emojis.map((emoji) => (
										<Box
											key={emoji}
											component="button"
											type="button"
											onClick={(event) => {
												event.stopPropagation();
												handleToggleReaction(
													emoji,
													myReactionEmoji === emoji ? "remove" : undefined,
												);
											}}
											sx={{
												width: 18,
												height: 18,
												flex: "0 0 18px",
												p: 0,
												border: 0,
												borderRadius: 999,
												bgcolor:
													myReactionEmoji === emoji
														? activeReactionBackground
														: "transparent",
												cursor: "pointer",
												fontSize: 13,
												lineHeight: 1,
												display: "inline-flex",
												alignItems: "center",
												justifyContent: "center",
												transition: "transform 0.14s ease",
												"&:hover": { transform: "scale(1.12)" },
											}}
										>
											{emoji}
										</Box>
									))}
								</Box>
								{!isCurrentUserSender && (
									<Box
										component="span"
										sx={{
											ml: 0.2,
											fontSize: 11,
											fontWeight: 600,
											lineHeight: 1,
											color: reactionCountColor,
											flex: "0 0 auto",
										}}
									>
										{reactionSummary.total}
									</Box>
								)}
							</Box>
						)}
						{!isCurrentUserSender && (
							<Box
								sx={{
									opacity: showReactionTrigger || hasReactionSummary ? 1 : 0.45,
									transition: "opacity 0.15s ease",
									"&:hover": { opacity: 1 },
								}}
							>
								{renderReactionTrigger()}
							</Box>
						)}
					</Box>
				) : null}

				{reactionPickerOpen && (
					<ReactionPicker
						myReactionEmoji={myReactionEmoji}
						anchorEl={reactionPickerAnchorEl}
						placement={isCurrentUserSender ? "top-end" : "top-start"}
						activeReactionBackground={activeReactionBackground}
						reactionBorderColor={reactionBorderColor}
						ambientTextColor={ambientTextColor}
						bubbleBackground={bubbleBackground}
						actionsSurfaceBackground={actionsSurfaceBackground}
						actionSurfaceShadow={actionSurfaceShadow}
						hasCustomTheme={hasCustomTheme}
						ambientBorderColor={ambientBorderColor}
						pickerRef={reactionPickerRef}
						onReactionSelect={handleReactionSelect}
						onMouseEnter={() => {
							isOverReactionPickerRef.current = true;
							handleHoverEnter();
						}}
						onMouseLeave={(event) => {
							isOverReactionPickerRef.current = false;
							handleHoverLeave(event);
						}}
						onClose={() => {
							setReactionPickerOpen(false);
							setReactionPickerAnchorEl(null);
							setActionsLocked(false);
							setHovered(false);
						}}
					/>
				)}
			</Box>

			{!isActivityMessage && (
				<Box
					sx={{
						visibility: showActions ? "visible" : "hidden",
						alignSelf: "center",
						flexShrink: 0,
						zIndex: 32,
					}}
				>
					<MessageActions
						canEditMessage={canEditMessage}
						bubbleBackground={bubbleBackground}
						actionsSurfaceBackground={actionsSurfaceBackground}
						ambientTextColor={ambientTextColor}
						ambientBorderColor={ambientBorderColor}
						actionButtonHoverBg={actionButtonHoverBg}
						actionButtonHoverTextColor={actionButtonHoverTextColor}
						actionsBoxShadow={actionsBoxShadow}
						hasCustomTheme={hasCustomTheme}
						onReply={() => onReplyMessage?.(message)}
						onDelete={() => onDeleteMessage?.(message.id)}
						onEdit={() => onEditMessage?.(message)}
						onMouseEnter={handleHoverEnter}
						onMouseLeave={handleHoverLeave}
						canSpeak={canSpeak}
						onSpeak={() => onSpeakMessage?.(message)}
					/>
				</Box>
			)}
		</Box>
	);
};

// keep for backward compat (MessageListBubble re-exports REACTION_OPTIONS)
export { REACTION_OPTIONS };
