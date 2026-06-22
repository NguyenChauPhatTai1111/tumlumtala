import { formatTimestamp } from "@/utils/dateTime";

export const formatMessengerTimestamp = (value?: string | null): string => {
	if (!value) {
		return "";
	}

	return formatTimestamp(value);
};
