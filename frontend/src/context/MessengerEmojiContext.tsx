import { groupEmojiItems } from "@components/messenger/composer/utils/emoji";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { getAllEmojiPacks } from "@/services/emojiPackService";
import { getActiveEmojis } from "@/services/emojiService";
import type { IEmoji, IEmojiPack } from "@/types/emoji";

type MessengerEmojiContextValue = {
	emojiItems: IEmoji[];
	emojiPacks: IEmojiPack[];
	emojiTypeMap: Record<string, string>;
	emojiTypeGroups: Map<string, IEmoji[]>;
	loading: boolean;
};

const MessengerEmojiContext = createContext<MessengerEmojiContextValue>({
	emojiItems: [],
	emojiPacks: [],
	emojiTypeMap: {},
	emojiTypeGroups: new Map(),
	loading: false,
});

export const useMessengerEmoji = () => useContext(MessengerEmojiContext);

export function MessengerEmojiProvider({ children }: { children: ReactNode }) {
	const [emojiItems, setEmojiItems] = useState<IEmoji[]>([]);
	const [emojiPacks, setEmojiPacks] = useState<IEmojiPack[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const [emojis, packs] = await Promise.all([
					getActiveEmojis(),
					getAllEmojiPacks(),
				]);
				setEmojiItems(emojis);
				setEmojiPacks(packs);
			} finally {
				setLoading(false);
			}
		};
		void load();
	}, []);

	const emojiTypeMap = useMemo(
		() =>
			Object.fromEntries(
				emojiPacks.map((p) => [p.code ?? String(p.id), p.name]),
			),
		[emojiPacks],
	);

	const emojiTypeGroups = useMemo(
		() => groupEmojiItems(emojiItems),
		[emojiItems],
	);

	const value = useMemo(
		() => ({ emojiItems, emojiPacks, emojiTypeMap, emojiTypeGroups, loading }),
		[emojiItems, emojiPacks, emojiTypeMap, emojiTypeGroups, loading],
	);

	return (
		<MessengerEmojiContext.Provider value={value}>
			{children}
		</MessengerEmojiContext.Provider>
	);
}
