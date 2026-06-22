export const buildGeneratedAvatar = (name?: string) => {
	if (!name?.trim()) return undefined;
	return `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}`;
};
