export type User = {
	name?: string;
	avatar?: string;
};

export type UserMenuProps = {
	user?: User;
	onOpenProfile: () => void;
	onOpenChangePassword: () => void;
};
