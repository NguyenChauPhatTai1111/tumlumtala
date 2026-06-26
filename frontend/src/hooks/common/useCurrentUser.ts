import { useCurrentUser as useMainCurrentUser } from "@hooks/user/useCurrentUser";

export const useCurrentUser = () => {
  const { user, loading, error, refresh } = useMainCurrentUser();
  return {
    data: user ?? undefined,
    isLoading: loading,
    error,
    refetch: refresh,
  } as any;
};
