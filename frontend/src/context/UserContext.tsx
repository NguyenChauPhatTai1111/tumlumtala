import { createContext, useContext } from "react";
import type { IUser } from "@/types";

export const UserContext = createContext<IUser | null>(null);
export const useUser = () => useContext(UserContext);
