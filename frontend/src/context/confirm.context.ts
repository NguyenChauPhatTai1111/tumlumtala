import { createContext } from "react";

export type ConfirmOptions = {
	title?: string;
	description?: string;
	variant?: string;
	confirmText?: string;
	cancelText?: string;
};
export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);
