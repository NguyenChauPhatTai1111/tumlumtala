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
		() => {
			const entries: Array<[string, string]> = [];
			for (const pack of emojiPacks) {
				if (pack.id) entries.push([`pack:${pack.id}`, pack.name]);
				if (pack.code) entries.push([pack.code, pack.name]);
				if (pack.id) entries.push([String(pack.id), pack.name]);
			}
			return Object.fromEntries(entries);
		},
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
