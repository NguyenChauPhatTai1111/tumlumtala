import { messengerKeys } from "@hooks/keys/messengerKeys";
import { searchUsers } from "@services/messengerService";
import { useQuery } from "@tanstack/react-query";

export const useSearchUsers = (searchQuery: string, page = 1, limit = 20) => {
	const enabled = searchQuery.trim().length >= 2;
	const result = useQuery({
		queryKey: messengerKeys.search(
			`${searchQuery}-page-${page}-limit-${limit}`,
		),
		queryFn: () => searchUsers(searchQuery, page, limit),
		enabled,
		placeholderData: undefined,
	});
	// Khi disabled, không trả về data cũ từ cache của query key trước
	return enabled ? result : { ...result, data: undefined, isLoading: false };
};
