import type {
	FilePreview,
	ImagePreview,
	VideoPreview,
} from "@components/messenger/composer/types";
import {
	getFileColor,
	getFileExtension,
	getFileIcon,
} from "@components/messenger/utils/filePreview";
import {
	formatFileSize,
	formatVideoDuration,
} from "@components/messenger/utils/format";
import CloseIcon from "@mui/icons-material/Close";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";

type ComposerImagePreviewProps = {
	selectedImages: ImagePreview[];
	onRemoveImage: (index: number) => void;
	selectedVideos?: VideoPreview[];
	onRemoveVideo?: (index: number) => void;
	selectedFiles?: FilePreview[];
	onRemoveFile?: (index: number) => void;
	onClearAll?: () => void;
	outgoingTextColor?: string;
};

type UnifiedItem =
	| {
			kind: "image";
			item: ImagePreview;
			originalIndex: number;
			addedAt: number;
	  }
	| {
			kind: "video";
			item: VideoPreview;
			originalIndex: number;
			addedAt: number;
	  }
	| { kind: "file"; item: FilePreview; originalIndex: number; addedAt: number };

const removeButtonSx = {
	position: "absolute",
	top: -8,
	right: -8,
	width: 22,
	height: 22,
	bgcolor: "error.main",
	color: "#fff !important",
	borderColor: "error.main",
	boxShadow: 2,
	"&:hover": {
		bgcolor: "error.main",
		color: "#fff",
		borderColor: "error.main",
	},
} as const;

export const ComposerImagePreview = ({
	selectedImages,
	onRemoveImage,
	selectedVideos = [],
	onRemoveVideo,
	selectedFiles = [],
	onRemoveFile,
	onClearAll,
	outgoingTextColor,
}: ComposerImagePreviewProps) => {
	const unifiedItems = useMemo<UnifiedItem[]>(() => {
		const items: UnifiedItem[] = [
			...selectedImages.map((item, i) => ({
				kind: "image" as const,
				item,
				originalIndex: i,
				addedAt: item.addedAt ?? i,
			})),
			...selectedVideos.map((item, i) => ({
				kind: "video" as const,
				item,
				originalIndex: i,
				addedAt: item.addedAt ?? selectedImages.length + i,
			})),
			...selectedFiles.map((item, i) => ({
				kind: "file" as const,
				item,
				originalIndex: i,
				addedAt:
					item.addedAt ?? selectedImages.length + selectedVideos.length + i,
			})),
		];
		return items.sort((a, b) => a.addedAt - b.addedAt);
	}, [selectedImages, selectedVideos, selectedFiles]);

	if (
		selectedImages.length === 0 &&
		selectedVideos.length === 0 &&
		selectedFiles.length === 0
	) {
		return null;
	}

	const totalCount =
		selectedImages.length + selectedVideos.length + selectedFiles.length;

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<Typography
					variant="caption"
					sx={{
						color: outgoingTextColor
							? `${outgoingTextColor} !important`
							: "inherit",
					}}
				>
					{totalCount} tệp đính kèm
				</Typography>
				{onClearAll && (
					<Tooltip title="Xóa toàn bộ">
						<IconButton size="small" color="error" onClick={onClearAll}>
							<DeleteSweepOutlinedIcon
								sx={{
									fontSize: 18,
									color: (theme) => `${theme.palette.error.main} !important`,
								}}
							/>
						</IconButton>
					</Tooltip>
				)}
			</Box>
			<Box
				sx={{
					display: "flex",
					gap: 1.5,
					overflowX: "auto",
					pb: 1,
					pt: 1.5,
					px: 0.5,
					flexWrap: "nowrap",
				}}
			>
				{unifiedItems.map((entry) => {
					if (entry.kind === "image") {
						const image = entry.item;
						const idx = entry.originalIndex;
						return (
							<Box
								key={image.preview}
								sx={{ position: "relative", flexShrink: 0 }}
							>
								<Box
									component="img"
									src={image.preview}
									alt=""
									sx={{
										width: 100,
										height: 100,
										objectFit: "cover",
										borderRadius: 2,
										borderColor: "divider",
										borderWidth: 1,
										borderStyle: "solid",
										bgcolor: "action.hover",
										display: "block",
									}}
								/>
								<Tooltip title="Xóa" placement="top">
									<IconButton
										size="small"
										onClick={() => onRemoveImage(idx)}
										sx={removeButtonSx}
									>
										<CloseIcon sx={{ fontSize: 12 }} />
									</IconButton>
								</Tooltip>
							</Box>
						);
					}

					if (entry.kind === "video") {
						const video = entry.item;
						const idx = entry.originalIndex;
						return (
							<Box
								key={video.preview}
								sx={{ position: "relative", flexShrink: 0 }}
							>
								<Box
									sx={{
										width: 100,
										height: 100,
										borderRadius: 2,
										overflow: "hidden",
										bgcolor: "action.hover",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										position: "relative",
										borderColor: "divider",
										borderWidth: 1,
										borderStyle: "solid",
									}}
								>
									<Box
										component="video"
										src={video.preview}
										muted
										preload="metadata"
										sx={{
											width: "100%",
											height: "100%",
											objectFit: "cover",
											borderRadius: 2,
										}}
									/>
									<Box
										sx={{
											position: "absolute",
											top: "50%",
											left: "50%",
											transform: "translate(-50%, -50%)",
											width: 40,
											height: 40,
											borderRadius: "50%",
											bgcolor: "#fff",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
											pointerEvents: "none",
											opacity: 0.7,
										}}
									>
										<PlayArrowIcon
											sx={{
												fontSize: 20,
												color: "#000 !important",
												ml: 0.25,
											}}
										/>
									</Box>
									{video.duration && (
										<Typography
											variant="caption"
											sx={{
												position: "absolute",
												bottom: 4,
												right: 4,
												bgcolor: "rgba(0,0,0,0.65)",
												color: "#fff",
												fontSize: 9,
												fontWeight: 700,
												px: 0.6,
												py: 0.2,
												borderRadius: 0.5,
												lineHeight: 1.2,
												letterSpacing: 0.5,
											}}
										>
											{formatVideoDuration(video.duration)}
										</Typography>
									)}
								</Box>
								<Tooltip title="Xóa" placement="top">
									<IconButton
										size="small"
										onClick={() => onRemoveVideo?.(idx)}
										sx={removeButtonSx}
									>
										<CloseIcon sx={{ fontSize: 12 }} />
									</IconButton>
								</Tooltip>
							</Box>
						);
					}

					// kind === "file"
					const file = entry.item;
					const idx = entry.originalIndex;
					return (
						<Box
							key={`${file.name}-${file.size}`}
							sx={{ position: "relative", flexShrink: 0 }}
						>
							<Box
								sx={{
									width: 120,
									height: 100,
									border: "2px solid",
									borderColor: getFileColor(file.mimeType, file.name),
									borderRadius: 2,
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									gap: 0.5,
									px: 1,
									py: 1,
									bgcolor: "action.hover",
									position: "relative",
									overflow: "hidden",
								}}
							>
								<Box
									sx={{
										position: "absolute",
										top: 0,
										left: 0,
										bgcolor: getFileColor(file.mimeType, file.name),
										color: "#fff",
										fontSize: 9,
										fontWeight: 800,
										px: 0.75,
										py: 0.3,
										borderBottomRightRadius: 6,
										lineHeight: 1.3,
										letterSpacing: 0.5,
									}}
								>
									{getFileExtension(file.name)}
								</Box>
								<Box
									sx={{
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: getFileColor(file.mimeType, file.name),
									}}
								>
									{getFileIcon(file.mimeType, file.name)}
								</Box>

								<Box sx={{ width: "100%", textAlign: "center" }}>
									<Typography
										variant="caption"
										fontWeight={600}
										sx={{
											display: "-webkit-box",
											WebkitLineClamp: 2,
											WebkitBoxOrient: "vertical",
											overflow: "hidden",
											wordBreak: "break-all",
											lineHeight: 1.3,
										}}
									>
										{file.name}
									</Typography>
									<Typography
										variant="caption"
										sx={{
											display: "block",
											color: outgoingTextColor
												? `${outgoingTextColor} !important`
												: "inherit",
										}}
									>
										{formatFileSize(file.size)}
									</Typography>
								</Box>
							</Box>
							<Tooltip title="Xóa" placement="top">
								<IconButton
									size="small"
									onClick={() => onRemoveFile?.(idx)}
									sx={removeButtonSx}
								>
									<CloseIcon sx={{ fontSize: 12 }} />
								</IconButton>
							</Tooltip>
						</Box>
					);
				})}
			</Box>
		</Box>
	);
};
