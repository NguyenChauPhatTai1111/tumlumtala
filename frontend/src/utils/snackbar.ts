type NotifyFn = (params: {
	message: string;
	description?: string;
	type: "success" | "error";
}) => void;

let notifyFn: NotifyFn | null = null;

export const setNotifyFn = (fn: NotifyFn) => {
	notifyFn = fn;
};

export const notify = (
	message: string,
	type: "success" | "error" = "success",
	description?: string,
) => {
	notifyFn?.({ message, type, description });
};
