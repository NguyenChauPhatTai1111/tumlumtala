import { useEffect, useState, useCallback } from "react";
import { getMe } from "@api/userApi";
import type { IUser } from "@/types";
import { authStore } from "@store/authStore";

let cachedUser: IUser | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((fn) => fn());

export const currentUserCache = {
  set: (user: IUser) => {
    cachedUser = user;
    notify();
  },
  clear: () => {
    cachedUser = null;
    notify();
  },
};

export const useCurrentUser = () => {
  const [user, setUser] = useState<IUser | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser && authStore.isAuthenticated());
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMe();
      cachedUser = data;
      notify();
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const sync = () => setUser(cachedUser);
    listeners.add(sync);
    return () => { listeners.delete(sync); };
  }, []);

  useEffect(() => {
    if (!cachedUser && authStore.isAuthenticated()) {
      refresh();
    }
  }, [refresh]);

  return { user, loading, error, refresh };
};
