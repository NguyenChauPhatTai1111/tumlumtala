import type { IUser } from "@/types";

export interface ProfileDialogProps {
	open: boolean;
	onClose: () => void;
	onSuccess?: (user?: IUser) => void | Promise<void>;
	user: IUser | null;
	canEditStatus?: boolean;
	canEditLevel?: boolean;
	mode?: "create" | "edit";
}

export interface ProfileFormProps {
	user: IUser | null;
	onClose: () => void;
	onSuccess?: (user?: IUser) => void | Promise<void>;
	canEditStatus?: boolean;
	canEditLevel?: boolean;
	mode?: "create" | "edit";
}

export interface ProfileFormValues {
	fullname: string;
	email: string;
	password?: string;
	age: number;
	gender: string;
	status: string;
	level: string;
}
