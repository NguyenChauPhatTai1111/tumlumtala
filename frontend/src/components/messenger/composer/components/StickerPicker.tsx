import HistoryIcon from "@mui/icons-material/History";
import { Box, CircularProgress, Tab, Tabs, Typography } from "@mui/material";
import type { ISticker, IStickerPack } from "@/types/sticker";
import { resolveCdnUrl } from "@/utils";

type StickerPickerProps = {
	loadingStickers: boolean;
	stickerPacks: IStickerPack[];
	activeStickerPackTab: string;
	setActiveStickerPackTab: (value: string) => void;
	displayedStickers: ISticker[];
	onPickSticker: (sticker: ISticker) => void;
};

export const StickerPicker = ({
	loadingStickers,
	stickerPacks,
	activeStickerPackTab,
	setActiveStickerPackTab,
	displayedStickers,
	onPickSticker,
}: StickerPickerProps) => {
	if (loadingStickers) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
				<CircularProgress size={24} />
			</Box>
		);
	}

	return (
		<Box sx={{ width: 1 }}>
			{stickerPacks.length > 0 ? (
				<Tabs
					value={activeStickerPackTab}
					onChange={(_, value) => setActiveStickerPackTab(String(value))}
					variant="scrollable"
					scrollButtons="auto"
				>
					<Tab
						value="recently_used"
						icon={<HistoryIcon />}
						aria-label="Recently Used"
					/>
					{stickerPacks.map((pack) => (
						<Tab
							key={pack.id}
							value={String(pack.id)}
							icon={
								<Box
									component="img"
									src={resolveCdnUrl(pack.thumbnail_url)}
									alt={pack.name}
									sx={{ width: 32, height: 32, objectFit: "contain" }}
								/>
							}
							sx={{ minWidth: 48, minHeight: 48 }}
						/>
					))}
				</Tabs>
			) : (
				<Typography
					variant="body2"
					sx={{ textAlign: "center", py: 3, color: "text.secondary" }}
				>
					Không có gói sticker nào hoạt động
				</Typography>
			)}

			<Box
				sx={{
					display: "grid",
					gap: 1.5,
					gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
					maxHeight: 280,
					overflowY: "auto",
					pr: 1,
					pt: 1,
				}}
			>
				{displayedStickers.map((sticker) => (
					<Box
						key={sticker.id}
						onClick={() => onPickSticker(sticker)}
						sx={{
							aspectRatio: "1/1",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							borderRadius: 2,
							cursor: "pointer",
							border: "1px solid transparent",
							transition: "all 0.2s",
							p: 0.5,
							"&:hover": {
								bgcolor: "action.hover",
								borderColor: "divider",
								transform: "scale(1.05)",
							},
						}}
					>
						<Box
							component="img"
							src={resolveCdnUrl(sticker.image_url)}
							alt={sticker.name}
							sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
						/>
					</Box>
				))}
			</Box>
		</Box>
	);
};
