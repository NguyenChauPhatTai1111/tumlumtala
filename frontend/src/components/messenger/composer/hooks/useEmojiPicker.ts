import {
	buildEmojiTypeTabs,
	normalizeEmojiType,
} from "@components/messenger/composer/utils/emoji";
import { useMessengerEmoji } from "@context/MessengerEmojiContext";
import { useCallback, useMemo, useRef, useState } from "react";
import type { IEmoji } from "@/types/emoji";
import type { IRecentItem } from "@/types/recent_items";

const RECENT_TAB_KEY = "recently_used";

export const useEmojiPicker = (recentItems: IRecentItem[]) => {
	const { emojiItems, emojiTypeMap, emojiTypeGroups, loading } =
		useMessengerEmoji();

	const [activeEmojiCategoryTab, setActiveEmojiCategoryTab] =
		useState(RECENT_TAB_KEY);

	const emojiTypeTabs = useMemo(
		() => buildEmojiTypeTabs(emojiTypeGroups, emojiTypeMap),
		[emojiTypeGroups, emojiTypeMap],
	);

	const effectiveActiveEmojiCategoryTab = useMemo(
		() =>
			emojiTypeTabs.some((tab) => tab.key === activeEmojiCategoryTab)
				? activeEmojiCategoryTab
				: RECENT_TAB_KEY,
		[activeEmojiCategoryTab, emojiTypeTabs],
	);

	const emojiScrollContainerRef = useRef<HTMLDivElement | null>(null);
	const categorySectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

	// no-op: emojis are pre-loaded by MessengerEmojiProvider
	const loadEmojis = useCallback(async () => {}, []);

	const scrollToEmojiCategory = useCallback((categoryKey: string) => {
		const target = categorySectionRefs.current[categoryKey];
		const container = emojiScrollContainerRef.current;

		if (!target || !container) {
			return;
		}

		container.scrollTo({
			top: target.offsetTop - 100,
			behavior: "smooth",
		});
	}, []);

	const recentEmojiItems = useMemo(
		() =>
			recentItems
				.filter((item) => item.item_type === "emoji")
				.sort((a, b) => b.id - a.id)
				.map((item) =>
					emojiItems.find((emoji) => Number(emoji.id) === Number(item.item_id)),
				)
				.filter(Boolean) as IEmoji[],
		[recentItems, emojiItems],
	);

	return {
		emojiItems,
		emojiTypeMap,
		emojiTypeTabs,
		emojiTypeGroups,
		loadingEmojis: loading,
		emojiError: null,
		effectiveActiveEmojiCategoryTab,
		activeEmojiCategoryTab,
		setActiveEmojiCategoryTab,
		emojiScrollContainerRef,
		categorySectionRefs,
		scrollToEmojiCategory,
		loadEmojis,
		recentEmojiItems,
		normalizeEmojiType,
	};
};
