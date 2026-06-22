import { useSearchDebounce } from "@hooks/table";
import {
	searchAllMessages,
	searchConversationMessages,
	searchUsers,
} from "@services/messengerService";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Message, User } from "@/types/messenger";

export type SearchDetailSource = "global" | "conversation";

export const useMessengerSearch = (debounceMs = 2000) => {
	const [keyword, setKeyword] = useState("");
	const debouncedKeyword = useSearchDebounce(keyword, debounceMs);

	const [globalResults, setGlobalResults] = useState<Message[]>([]);
	const [userResults, setUserResults] = useState<User[]>([]);
	const [loading, setLoading] = useState(false);
	const [active, setActive] = useState(false);

	const [detailConversationId, setDetailConversationId] = useState<
		number | null
	>(null);
	const [detailResults, setDetailResults] = useState<Message[]>([]);
	const [detailLoading, setDetailLoading] = useState(false);
	const [detailOffset, setDetailOffset] = useState(0);
	const [detailHasMore, setDetailHasMore] = useState(true);
	const [detailSource, setDetailSource] = useState<SearchDetailSource | null>(
		null,
	);
	const [detailKeyword, setDetailKeyword] = useState("");

	const requestIdRef = useRef(0);

	const clear = useCallback(() => {
		requestIdRef.current += 1;
		setGlobalResults([]);
		setUserResults([]);
		setActive(false);
		setLoading(false);
		setDetailConversationId(null);
		setDetailResults([]);
		setDetailLoading(false);
		setDetailOffset(0);
		setDetailHasMore(true);
		setDetailSource(null);
	}, []);

	const loadConversationDetail = useCallback(
		async (conversationId: number, kw: string, offset = 0) => {
			setKeyword(kw);
			const normalized = kw.trim();
			// store the keyword used for current detail listing so load-more can reuse it
			setDetailKeyword(normalized);
			if (normalized.length < 2) {
				setDetailResults([]);
				setDetailOffset(0);
				setDetailHasMore(true);
				return;
			}

			const requestId = ++requestIdRef.current;
			setDetailLoading(true);
			try {
				// debug log to help trace load-more calls
				// eslint-disable-next-line no-console
				console.debug("useMessengerSearch: loadConversationDetail start", {
					conversationId,
					normalized,
					offset,
				});
				const resp = await searchConversationMessages(
					conversationId,
					normalized,
					50,
					offset,
				);
				// eslint-disable-next-line no-console
				console.debug("useMessengerSearch: loadConversationDetail response", {
					items: resp.items.length,
					hasMore: resp.hasMore,
				});
				if (requestId !== requestIdRef.current) return;

				if (offset > 0) {
					setDetailResults((prev) => [...prev, ...resp.items]);
					setDetailOffset(offset);
				} else {
					setDetailResults(resp.items);
					setDetailOffset(0);
				}
				setDetailHasMore(resp.hasMore);
			} catch {
				if (requestId !== requestIdRef.current) return;
				if (offset === 0) {
					setDetailResults([]);
					setDetailOffset(0);
					setDetailHasMore(true);
				}
			} finally {
				// Always clear loading flag so UI doesn't stay stuck if requestId changed
				setDetailLoading(false);
			}
		},
		[],
	);

	const loadMoreConversationDetail = useCallback(async () => {
		if (!detailConversationId || detailLoading || !detailHasMore) {
			return;
		}

		// use the stored detail keyword to ensure we pass the same query
		await loadConversationDetail(
			detailConversationId,
			detailKeyword || keyword,
			detailOffset + 50,
		);
	}, [
		detailConversationId,
		detailHasMore,
		detailLoading,
		detailOffset,
		keyword,
		loadConversationDetail,
		detailKeyword,
	]);

	useEffect(() => {
		const timeout = setTimeout(() => {
			const normalized = debouncedKeyword.trim();
			if (normalized.length < 2) {
				setGlobalResults([]);
				setUserResults([]);
				setLoading(false);
				setActive(false);
				if (detailConversationId) {
					setDetailResults([]);
					setDetailOffset(0);
					setDetailHasMore(true);
				}
				return;
			}

			const requestId = ++requestIdRef.current;
			setLoading(true);
			setActive(!detailConversationId);

			(async () => {
				try {
					if (detailConversationId) {
						const response = await searchAllMessages(normalized, 100);
						if (requestId !== requestIdRef.current) return;
						setGlobalResults(response.items);
						setUserResults([]);

						const detailResponse = await searchConversationMessages(
							detailConversationId,
							normalized,
							50,
							0,
						);
						if (requestId !== requestIdRef.current) return;
						setDetailResults(detailResponse.items);
						setDetailOffset(0);
						setDetailHasMore(detailResponse.hasMore);
					} else {
						const [messageResponse, userResponse] = await Promise.all([
							searchAllMessages(normalized, 100),
							searchUsers(normalized, 1, 20),
						]);
						if (requestId !== requestIdRef.current) return;
						setGlobalResults(messageResponse.items);
						setUserResults(userResponse.items);
					}
				} catch {
					if (requestId !== requestIdRef.current) return;
					setGlobalResults([]);
					setUserResults([]);
					if (detailConversationId) setDetailResults([]);
				} finally {
					if (requestId === requestIdRef.current) setLoading(false);
				}
			})();
		}, 0);

		return () => clearTimeout(timeout);
	}, [debouncedKeyword, detailConversationId]);

	return {
		keyword,
		setKeyword,
		debouncedKeyword,
		globalResults,
		setGlobalResults,
		userResults,
		setUserResults,
		loading,
		active,
		setActive,
		detailConversationId,
		setDetailConversationId,
		detailResults,
		setDetailResults,
		detailLoading,
		detailOffset,
		detailHasMore,
		detailSource,
		setDetailSource,
		clear,
		loadConversationDetail,
		loadMoreConversationDetail,
	} as const;
};

export default useMessengerSearch;
