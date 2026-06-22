import type { IUser } from "@/types";

const normalizeToken = (value: unknown) =>
	String(value ?? "")
		.trim()
		.toLowerCase();

const uniq = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

export const getUserPermissions = (user?: IUser | null): string[] => {
	if (!user) {
		return [];
	}

	const source = user as IUser & {
		permission?: unknown;
		role_permissions?: unknown;
		rolePermissions?: unknown;
	};

	const collectFrom = (value: unknown): string[] => {
		if (!value) {
			return [];
		}

		if (Array.isArray(value)) {
			return value
				.map((item) => {
					if (typeof item === "string") {
						return normalizeToken(item);
					}

					if (item && typeof item === "object") {
						const objectItem = item as Record<string, unknown>;
						return normalizeToken(
							objectItem.name ?? objectItem.code ?? objectItem.permission,
						);
					}

					return "";
				})
				.filter(Boolean);
		}

		if (typeof value === "string") {
			return [normalizeToken(value)];
		}

		return [];
	};

	return uniq([
		...collectFrom(source.permissions),
		...collectFrom(source.permission),
		...collectFrom(source.role_permissions),
		...collectFrom(source.rolePermissions),
	]);
};

export const isAdminIdentity = (user?: IUser | null): boolean => {
	if (!user) {
		return false;
	}

	const levelValue = normalizeToken(user.level);
	const hasAdminRole = !!user.roles?.some(
		(role) => normalizeToken(role) === "admin",
	);
	const permissions = getUserPermissions(user);

	return (
		Number(user.level) === 1 ||
		levelValue === "administrator" ||
		levelValue === "admin" ||
		hasAdminRole ||
		permissions.some((permission) => permission.startsWith("permission."))
	);
};

export const buildResourceCandidates = (
	resource: string,
	apiResources: string[] = [],
): string[] => {
	const normalizedResource = normalizeToken(resource);

	if (!normalizedResource) {
		return [];
	}

	const candidates = new Set<string>([normalizedResource]);

	if (normalizedResource.endsWith("ies")) {
		candidates.add(`${normalizedResource.slice(0, -3)}y`);
	}

	if (normalizedResource.endsWith("s")) {
		candidates.add(normalizedResource.slice(0, -1));
	} else {
		candidates.add(`${normalizedResource}s`);
	}

	candidates.add(normalizedResource.replace(/-/g, "_"));
	candidates.add(normalizedResource.replace(/_/g, "-"));

	const normalizedApiResources = apiResources
		.map((item) => normalizeToken(item))
		.filter(Boolean);

	normalizedApiResources.forEach((apiResource) => {
		if (
			Array.from(candidates).some(
				(candidate) =>
					apiResource.startsWith(candidate) ||
					candidate.startsWith(apiResource),
			)
		) {
			candidates.add(apiResource);
		}
	});

	return Array.from(candidates).filter(Boolean);
};

export const hasAnyPermissionForResource = (
	user: IUser | null | undefined,
	resource: string,
	apiResources: string[] = [],
): boolean => {
	if (isAdminIdentity(user)) {
		return true;
	}

	const permissions = getUserPermissions(user);
	if (permissions.length === 0) {
		return false;
	}

	const resourceCandidates = buildResourceCandidates(resource, apiResources);

	return permissions.some((permission) =>
		resourceCandidates.some(
			(candidate) =>
				permission === candidate || permission.startsWith(`${candidate}.`),
		),
	);
};

export const hasActionPermission = (
	user: IUser | null | undefined,
	resource: string,
	action: string,
	apiResources: string[] = [],
): boolean => {
	if (isAdminIdentity(user)) {
		return true;
	}

	const permissions = getUserPermissions(user);
	if (permissions.length === 0) {
		return false;
	}

	const normalizedAction = normalizeToken(action);
	const rootAction = normalizedAction.split(".")[0];
	const resourceCandidates = buildResourceCandidates(resource, apiResources);

	return permissions.some((permission) =>
		resourceCandidates.some((candidate) => {
			const exactAction = `${candidate}.${normalizedAction}`;
			const exactRootAction = `${candidate}.${rootAction}`;

			return (
				permission === exactAction ||
				permission.startsWith(`${exactAction}.`) ||
				permission === exactRootAction ||
				permission.startsWith(`${exactRootAction}.`)
			);
		}),
	);
};
