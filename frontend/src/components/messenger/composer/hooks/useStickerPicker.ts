import { useCallback, useMemo, useState } from "react";
import { getAllStickerPacks } from "@/services/stickerPackService";
import { getActiveStickers } from "@/services/stickerService";
import type { IRecentItem } from "@/types/recent_items";
import type { ISticker, IStickerPack } from "@/types/sticker";

const RECENT_TAB_KEY = "recently_used";

export const useStickerPicker = (recentItems: IRecentItem[]) => {
	const [stickerPacks, setStickerPacks] = useState<IStickerPack[]>([]);
	const [stickers, setStickers] = useState<ISticker[]>([]);
	const [loadingStickers, setLoadingStickers] = useState(false);
	const [activeStickerPackTab, setActiveStickerPackTab] =
		useState(RECENT_TAB_KEY);

	const loadStickersAndPacks = useCallback(async () => {
		if (loadingStickers) {
			return;
		}

		setLoadingStickers(true);

		try {
			const [packsData, stickersData] = await Promise.all([
				getAllStickerPacks(),
				getActiveStickers(),
			]);

			const activePacks = (packsData || []).filter((pack) => pack.is_active);
			const activeStickers = (stickersData || []).filter(
				(sticker) => sticker.is_active,
			);

			setStickerPacks(activePacks);
			setStickers(activeStickers);

			if (activePacks.length > 0) {
				setActiveStickerPackTab(String(activePacks[0].id));
			}
		} catch (error) {
			console.error("Error loading stickers:", error);
		} finally {
			setLoadingStickers(false);
		}
	}, [loadingStickers]);

	const recentStickerItems = useMemo(
		() =>
			recentItems
				.filter((item) => item.item_type === "sticker")
				.sort((a, b) => b.id - a.id)
				.map((item) =>
					stickers.find(
						(sticker) => Number(sticker.id) === Number(item.item_id),
					),
				)
				.filter(Boolean) as ISticker[],
		[recentItems, stickers],
	);

	const displayedStickers = useMemo(
		() =>
			activeStickerPackTab === RECENT_TAB_KEY
				? recentStickerItems
				: stickers.filter(
						(sticker) => String(sticker.pack_id) === activeStickerPackTab,
					),
		[activeStickerPackTab, recentStickerItems, stickers],
	);

	return {
		stickerPacks,
		stickers,
		loadingStickers,
		activeStickerPackTab,
		setActiveStickerPackTab,
		loadStickersAndPacks,
		displayedStickers,
	};
};
