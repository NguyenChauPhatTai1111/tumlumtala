import { getMe } from "@api/authApi";
import { useQuery } from "@tanstack/react-query";
import type { IUser } from "@/types";

export const useCurrentUser = () => {
  return useQuery<IUser>({
    queryKey: ["currentUser"],
    queryFn: getMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};
