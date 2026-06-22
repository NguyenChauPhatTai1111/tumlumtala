import { ConfirmContext } from "@context/confirm.context";
import { useContext } from "react";

export const useConfirm = () => {
	const context = useContext(ConfirmContext);

	if (!context) {
		throw new Error("useConfirm must be used within ConfirmProvider");
	}

	return context;
};
