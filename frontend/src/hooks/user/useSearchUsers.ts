import { messengerKeys } from "@hooks/keys/messengerKeys";
import { searchUsers } from "@services/messengerService";
import { useQuery } from "@tanstack/react-query";

export const useSearchUsers = (searchQuery: string, page = 1, limit = 20) => {
	return useQuery({
		queryKey: messengerKeys.search(
			`${searchQuery}-page-${page}-limit-${limit}`,
		),
		queryFn: () => searchUsers(searchQuery, page, limit),
		enabled: searchQuery.trim().length >= 2,
	});
};
