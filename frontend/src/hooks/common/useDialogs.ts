import { useState } from "react";
import type { BaseEntity } from "@/types/base";

export interface UseDialogsOptions<_T extends BaseEntity> {
	initialDialogs?: string[];
}

export const useDialogs = <T extends BaseEntity>(
	options?: UseDialogsOptions<T>,
) => {
	const defaultDialogs = options?.initialDialogs || ["edit"];
	const [openDialogs, setOpenDialogs] = useState<Record<string, boolean>>(
		() => {
			const initial: Record<string, boolean> = {};
			for (const dialog of defaultDialogs) {
				initial[dialog] = false;
			}
			return initial;
		},
	);
	const [selectedItem, setSelectedItem] = useState<T | null>(null);

	const openDialog = (dialogName: string) => {
		setOpenDialogs((prev) => ({ ...prev, [dialogName]: true }));
	};

	const closeDialog = (dialogName: string) => {
		setOpenDialogs((prev) => ({ ...prev, [dialogName]: false }));
		setSelectedItem(null);
	};

	const toggleDialog = (dialogName: string) => {
		setOpenDialogs((prev) => ({ ...prev, [dialogName]: !prev[dialogName] }));
	};

	const openDialogWithItem = (dialogName: string, item: T) => {
		setSelectedItem(item);
		openDialog(dialogName);
	};

	return {
		openDialogs,
		selectedItem,
		setSelectedItem,
		openDialog,
		closeDialog,
		toggleDialog,
		openDialogWithItem,
	};
};
