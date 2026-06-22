import { useEmojiPicker } from "@components/messenger/composer/hooks/useEmojiPicker";
import { useFileAttachments } from "@components/messenger/composer/hooks/useFileAttachments";
import { useImageAttachments } from "@components/messenger/composer/hooks/useImageAttachments";
import { useStickerPicker } from "@components/messenger/composer/hooks/useStickerPicker";
import { useTypingIndicator } from "@components/messenger/composer/hooks/useTypingIndicator";
import { useVideoAttachments } from "@components/messenger/composer/hooks/useVideoAttachments";
import type {
	ComposerTab,
	ImagePreview,
} from "@components/messenger/composer/types";
import { getEmojiText } from "@components/messenger/composer/utils/emoji";
import type { MessengerComposerProps } from "@components/messenger/types/composer";
import { useRecentItems } from "@hooks/messenger";
import { Box, Typography } from "@mui/material";
import {
	type DragEvent,
	type MouseEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { IEmoji } from "@/types/emoji";
import type { ISticker } from "@/types/sticker";
import { ComposerImagePreview } from "./ComposerImagePreview";
import { ComposerInput } from "./ComposerInput";
import { ComposerReplyBanner } from "./ComposerReplyBanner";
import { PickerPopover } from "./PickerPopover";

export const MessengerComposer = ({
	disabled,
	focusKey,
	replyMessage,
	replySenderName,
	outgoingTextColor,
	editingMessage,
	useDefaultTheme = true,
	chatSurface,
	conversationId,
	draftText = "",
	draftImages = [],
	draftVideos = [],
	draftFiles = [],
	onDraftChange,
	quickReaction,
	ws,
	onCancelReply,
	onCancelEdit,
	onSend,
}: MessengerComposerProps) => {
	const [text, setText] = useState(() => editingMessage?.content ?? draftText);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [pickerAnchorEl, setPickerAnchorEl] = useState<HTMLElement | null>(
		null,
	);
	const [activeTab, setActiveTab] = useState<ComposerTab>("emoji");

	const inputRef = useRef<HTMLTextAreaElement>(null);
	const editingMessageIdRef = useRef<number | null>(null);
	const selectedVideosRef = useRef<
		import("@components/messenger/composer/types").VideoPreview[]
	>([]);
	const selectedFilesRef = useRef<
		import("@components/messenger/composer/types").FilePreview[]
	>([]);
	const selectedImagesRef = useRef<ImagePreview[]>(draftImages);
	const textRef = useRef(editingMessage?.content ?? draftText);
	const { handleTextChange, clearTypingState } = useTypingIndicator(
		ws ?? null,
		conversationId,
	);

	const {
		selectedImages,
		fileError: imageFileError,
		isCanSend: hasImageAttachments,
		handleSelectImages,
		handleRemoveImage,
		clearSelectedImages,
	} = useImageAttachments(
		draftImages,
		onDraftChange
			? (images) => {
					selectedImagesRef.current = images;
					onDraftChange({
						text: textRef.current,
						images,
						videos: selectedVideosRef.current,
						files: selectedFilesRef.current,
					});
				}
			: undefined,
	);

	const {
		selectedVideos,
		fileError: videoFileError,
		isCanSend: hasVideoAttachment,
		handleSelectVideo,
		handleRemoveVideo,
		clearSelectedVideos,
	} = useVideoAttachments(
		draftVideos,
		onDraftChange
			? (videos) => {
					selectedVideosRef.current = videos;
					onDraftChange({
						text: textRef.current,
						images: selectedImagesRef.current,
						videos,
						files: selectedFilesRef.current,
					});
				}
			: undefined,
	);

	const {
		selectedFiles,
		fileError: fileAttachError,
		isCanSend: hasFileAttachment,
		handleSelectFile,
		handleRemoveFile,
		clearSelectedFiles,
	} = useFileAttachments(
		draftFiles,
		onDraftChange
			? (files) => {
					selectedFilesRef.current = files;
					onDraftChange({
						text: textRef.current,
						images: selectedImagesRef.current,
						videos: selectedVideosRef.current,
						files,
					});
				}
			: undefined,
	);

	const fileError = imageFileError || videoFileError || fileAttachError;

	useEffect(() => {
		selectedImagesRef.current = selectedImages;
	}, [selectedImages]);

	const editingMessageRef = useRef(editingMessage);
	useEffect(() => {
		editingMessageRef.current = editingMessage;
	}, [editingMessage]);

	const onDraftChangeRef = useRef(onDraftChange);
	useEffect(() => {
		onDraftChangeRef.current = onDraftChange;
	}, [onDraftChange]);

	useEffect(() => {
		textRef.current = text;
	}, [text]);

	useEffect(() => {
		selectedVideosRef.current = selectedVideos;
	}, [selectedVideos]);

	useEffect(() => {
		selectedFilesRef.current = selectedFiles;
	}, [selectedFiles]);

	const draftChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const handleComposerTextChange = useCallback(
		(value: string) => {
			handleTextChange(value, setText);

			if (!editingMessage && onDraftChange) {
				if (draftChangeTimeoutRef.current) {
					clearTimeout(draftChangeTimeoutRef.current);
				}
				draftChangeTimeoutRef.current = setTimeout(() => {
					onDraftChange({
						text: value,
						images: selectedImagesRef.current,
						videos: selectedVideosRef.current,
						files: selectedFilesRef.current,
					});
					draftChangeTimeoutRef.current = null;
				}, 300);
			}
		},
		[editingMessage, handleTextChange, onDraftChange],
	);

	const handlePaste = useCallback(
		(e: React.ClipboardEvent<HTMLElement>) => {
			const items = e.clipboardData?.items;
			if (!items?.length) return;

			for (const item of items) {
				if (!item.type.startsWith("image/")) continue;
				e.preventDefault();
				const file = item.getAsFile();
				if (!file) return;

				const dataTransfer = new DataTransfer();
				dataTransfer.items.add(file);
				const fakeEvent = {
					target: { files: dataTransfer.files },
				} as React.ChangeEvent<HTMLInputElement>;

				handleSelectImages(fakeEvent, () => {
					inputRef.current?.focus();
				});
				break;
			}
		},
		[handleSelectImages],
	);

	const clearDraft = useCallback(() => {
		setText("");
		onDraftChange?.({ text: "", images: [], videos: [], files: [] });
	}, [onDraftChange]);

	const { data: recentItems, loadData: loadRecentItems } = useRecentItems(
		Number(conversationId),
	);
	const {
		emojiItems,
		emojiTypeMap,
		emojiTypeTabs,
		emojiTypeGroups,
		loadingEmojis,
		emojiError,
		effectiveActiveEmojiCategoryTab,
		setActiveEmojiCategoryTab,
		emojiScrollContainerRef,
		categorySectionRefs,
		scrollToEmojiCategory,
		loadEmojis,
		recentEmojiItems,
	} = useEmojiPicker(recentItems);
	const {
		stickerPacks,
		loadingStickers,
		activeStickerPackTab,
		setActiveStickerPackTab,
		loadStickersAndPacks,
		displayedStickers,
	} = useStickerPicker(recentItems);

	const isCanSend = useMemo(
		() =>
			text.trim().length > 0 ||
			hasImageAttachments ||
			hasVideoAttachment ||
			hasFileAttachment,
		[text, hasImageAttachments, hasVideoAttachment, hasFileAttachment],
	);

	useEffect(() => {
		return () => {
			if (draftChangeTimeoutRef.current) {
				clearTimeout(draftChangeTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (!disabled) inputRef.current?.focus();
	}, [disabled]);

	useEffect(() => {
		if (!disabled && focusKey) inputRef.current?.focus();
	}, [disabled, focusKey]);

	useEffect(() => {
		if (!disabled && replyMessage) inputRef.current?.focus();
	}, [disabled, replyMessage]);

	useEffect(() => {
		if (!editingMessage) {
			editingMessageIdRef.current = null;
			return;
		}
		if (editingMessageIdRef.current === editingMessage.id) return;
		editingMessageIdRef.current = editingMessage.id;
		setText(editingMessage.content);
		inputRef.current?.focus();
	}, [editingMessage]);

	const handleOpenEmoji = async (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		setPickerAnchorEl(event.currentTarget);
		setPickerOpen(true);
		await loadRecentItems();
		if (emojiItems.length === 0) {
			await loadEmojis();
		}
	};

	const handleCloseEmojiPicker = () => {
		setPickerOpen(false);
		setPickerAnchorEl(null);
		setTimeout(() => {
			inputRef.current?.focus();
		}, 100);
	};

	const handlePickEmoji = async (item: IEmoji) => {
		if (disabled) return;
		const emojiText = getEmojiText(item).trim();
		if (!emojiText) return;
		clearTypingState();
		handleCloseEmojiPicker();
		await onSend(emojiText, "emoji", Number(item.id));
	};

	const handlePickSticker = async (sticker: ISticker) => {
		if (disabled) return;
		const imgUrl = sticker.image_url;
		if (!imgUrl) return;
		clearTypingState();
		handleCloseEmojiPicker();
		await onSend(imgUrl, "sticker", Number(sticker.id));
	};

	const handleSend = async () => {
		const trimmed = text.trim();

		if (
			!trimmed &&
			selectedImages.length === 0 &&
			selectedVideos.length === 0 &&
			selectedFiles.length === 0
		) {
			return;
		}

		if (
			(selectedImages.length > 0 ||
				selectedVideos.length > 0 ||
				selectedFiles.length > 0) &&
			!conversationId
		) {
			console.error("Cannot upload media without a conversation id");
			return;
		}

		clearTypingState();

		const imagesToSend = [...selectedImages];
		const videosToSend = [...selectedVideos];
		const filesToSend = [...selectedFiles];
		let result: boolean | undefined = true;

		if (trimmed) {
			const sendTextResult = await onSend(trimmed);
			if (sendTextResult === false) return;
		}

		if (imagesToSend.length > 0) {
			clearSelectedImages({ revoke: false });
			const sendResults = await Promise.all(
				imagesToSend.map((image) =>
					onSend([
						{
							type: "image",
							content: image.preview,
							file: image.file,
							metadata: {
								original_name: image.file.name,
								size: image.file.size,
								mime_type: image.file.type,
							},
						},
					]),
				),
			);
			result = sendResults.every((item) => item !== false);
		}

		if (videosToSend.length > 0) {
			clearSelectedVideos({ revoke: false });
			const videoResults = await Promise.all(
				videosToSend.map((video) =>
					onSend([
						{
							type: "video",
							content: video.preview,
							file: video.file,
							metadata: {
								original_name: video.file.name,
								size: video.file.size,
								mime_type: video.file.type,
								duration: Math.round((video.duration ?? 0) * 1000),
							},
						},
					]),
				),
			);
			if (videoResults.some((r) => r === false)) result = false;
		}

		if (filesToSend.length > 0) {
			clearSelectedFiles();
			const fileResults = await Promise.all(
				filesToSend.map((file) =>
					onSend([
						{
							type: "file",
							content: file.name,
							file: file.file,
							metadata: {
								original_name: file.file.name,
								size: file.file.size,
								mime_type: file.file.type,
							},
						},
					]),
				),
			);
			if (fileResults.some((r) => r === false)) result = false;
		}

		clearDraft();
		setTimeout(() => {
			inputRef.current?.focus();
		}, 100);

		return result;
	};

	useEffect(() => {
		if (selectedImages.length > 0) inputRef.current?.focus();
	}, [selectedImages]);

	const [isDragOver, setIsDragOver] = useState(false);
	const dragCounterRef = useRef(0);

	const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounterRef.current += 1;
		if (e.dataTransfer.types.includes("Files")) {
			setIsDragOver(true);
		}
	}, []);

	const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounterRef.current -= 1;
		if (dragCounterRef.current === 0) {
			setIsDragOver(false);
		}
	}, []);

	const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleDrop = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			e.stopPropagation();
			dragCounterRef.current = 0;
			setIsDragOver(false);

			const files = Array.from(e.dataTransfer.files);
			if (!files.length) return;

			const imageFiles = files.filter((f) => f.type.startsWith("image/"));
			const videoFiles = files.filter((f) => f.type.startsWith("video/"));
			const otherFiles = files.filter(
				(f) => !f.type.startsWith("image/") && !f.type.startsWith("video/"),
			);

			const makeEvent = (fileList: File[]) => {
				const dt = new DataTransfer();
				for (const f of fileList) dt.items.add(f);
				return {
					target: { files: dt.files, value: "" },
				} as unknown as React.ChangeEvent<HTMLInputElement>;
			};

			if (imageFiles.length > 0) {
				handleSelectImages(makeEvent(imageFiles), () => {
					inputRef.current?.focus();
				});
			}
			if (videoFiles.length > 0) {
				handleSelectVideo(makeEvent(videoFiles), () => {
					inputRef.current?.focus();
				});
			}
			if (otherFiles.length > 0) {
				handleSelectFile(makeEvent(otherFiles), () => {
					inputRef.current?.focus();
				});
			}
		},
		[handleSelectImages, handleSelectVideo, handleSelectFile],
	);

	const customBorderColor = chatSurface ? "rgba(148,163,184,0.35)" : "divider";

	return (
		<Box
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
			sx={{
				p: 1.5,
				bgcolor: editingMessage ? "action.selected" : "transparent",
				color: outgoingTextColor || "inherit",
				borderTop: "1px solid",
				borderColor: useDefaultTheme ? "divider" : customBorderColor,
				display: "flex",
				flexDirection: "column",
				gap: 1,
				transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
				"& .MuiIconButton-root, & .MuiSvgIcon-root": { color: "inherit" },
				position: "relative",
			}}
		>
			{isDragOver && (
				<Box
					sx={{
						position: "absolute",
						inset: 0,
						zIndex: 200,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: 1,
						bgcolor: (theme) =>
							theme.palette.mode === "dark"
								? "rgba(15,30,60,0.92)"
								: "rgba(235,245,255,0.95)",
						border: "2px dashed",
						borderColor: "primary.main",
						borderRadius: 2,
						pointerEvents: "none",
					}}
				>
					<Typography variant="subtitle1" fontWeight={700} color="primary.main">
						Xem trước khi gửi
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Thả File hoặc Ảnh vào đây để xem lại trước khi gửi
					</Typography>
				</Box>
			)}
			<ComposerReplyBanner
				editingMessage={editingMessage}
				outgoingTextColor={outgoingTextColor}
				replyMessage={replyMessage}
				replySenderName={replySenderName}
				onCancelReply={onCancelReply}
				onCancelEdit={onCancelEdit}
			/>

			<Box
				sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 1 }}
			>
				<ComposerImagePreview
					selectedImages={selectedImages}
					onRemoveImage={(index) => {
						handleRemoveImage(index);
						inputRef.current?.focus();
					}}
					outgoingTextColor={outgoingTextColor}
					selectedVideos={selectedVideos}
					onRemoveVideo={(index) => {
						handleRemoveVideo(index);
						inputRef.current?.focus();
					}}
					selectedFiles={selectedFiles}
					onRemoveFile={(index) => {
						handleRemoveFile(index);
						inputRef.current?.focus();
					}}
					onClearAll={() => {
						clearSelectedImages();
						clearSelectedVideos();
						clearSelectedFiles();
						onDraftChange?.({
							text: textRef.current,
							images: [],
							videos: [],
							files: [],
						});
						inputRef.current?.focus();
					}}
				/>

				{fileError ? (
					<Typography color="error" variant="caption">
						{fileError}
					</Typography>
				) : null}

				<ComposerInput
					disabled={disabled}
					text={text}
					inputRef={inputRef}
					onTextChange={handleComposerTextChange}
					outgoingTextColor={outgoingTextColor}
					onSend={handleSend}
					onPaste={handlePaste}
					onOpenEmoji={handleOpenEmoji}
					onSelectImages={(event) =>
						handleSelectImages(event, () => {
							inputRef.current?.focus();
						})
					}
					onSelectVideo={(event) =>
						handleSelectVideo(event, () => {
							inputRef.current?.focus();
						})
					}
					onSelectFile={(event) =>
						handleSelectFile(event, () => {
							inputRef.current?.focus();
						})
					}
					isCanSend={isCanSend}
					quickReaction={quickReaction}
					onQuickEmoji={async () => {
						if (disabled) return;
						const reaction = quickReaction?.trim() || "👍";
						clearTypingState();
						const result = await onSend(reaction, "emoji");
						if (result !== false) inputRef.current?.focus();
					}}
				/>
			</Box>

			<PickerPopover
				open={pickerOpen}
				anchorEl={pickerAnchorEl}
				activeTab={activeTab}
				loadingEmojis={loadingEmojis}
				emojiError={emojiError}
				emojiTypeTabs={emojiTypeTabs}
				effectiveActiveEmojiCategoryTab={effectiveActiveEmojiCategoryTab}
				emojiTypeMap={emojiTypeMap}
				recentEmojiItems={recentEmojiItems}
				emojiTypeGroups={emojiTypeGroups}
				emojiScrollContainerRef={emojiScrollContainerRef}
				categorySectionRefs={categorySectionRefs}
				loadingStickers={loadingStickers}
				stickerPacks={stickerPacks}
				activeStickerPackTab={activeStickerPackTab}
				displayedStickers={displayedStickers}
				onClose={handleCloseEmojiPicker}
				onTabChange={async (newTab) => {
					setActiveTab(newTab);
					if (newTab !== "emoji") {
						setActiveEmojiCategoryTab("recently_used");
					}
					if (newTab === "sticker" && stickerPacks.length === 0) {
						await loadStickersAndPacks();
					}
				}}
				onPickEmoji={handlePickEmoji}
				onPickSticker={handlePickSticker}
				setActiveEmojiCategoryTab={setActiveEmojiCategoryTab}
				scrollToEmojiCategory={scrollToEmojiCategory}
				setActiveStickerPackTab={setActiveStickerPackTab}
			/>
		</Box>
	);
};
