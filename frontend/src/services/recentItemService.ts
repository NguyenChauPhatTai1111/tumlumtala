import type { IRecentItem } from "@/types/recent_items";

const STORAGE_KEY = "messenger_recent_items";
const MAX_PER_TYPE = 24;

const readAll = (): IRecentItem[] => {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
	} catch {
		return [];
	}
};

const writeAll = (items: IRecentItem[]) => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const getRecentItems = (): IRecentItem[] => readAll();

export const addRecentItem = (
	item_type: "emoji" | "sticker",
	item_id: number,
	name: string,
): void => {
	let items = readAll();

	items = items.filter(
		(i) => !(i.item_type === item_type && i.item_id === item_id),
	);

	const newItem: IRecentItem = {
		id: Date.now(),
		item_type,
		item_id,
		name,
		updated_at: new Date().toISOString(),
	};

	items.unshift(newItem);

	const ofType = items.filter((i) => i.item_type === item_type);
	const others = items.filter((i) => i.item_type !== item_type);
	items = [...ofType.slice(0, MAX_PER_TYPE), ...others];

	writeAll(items);
};
