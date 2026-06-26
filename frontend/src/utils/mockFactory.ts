import type { IUser } from "@/types";
import type { IPermission, IRole } from "@/types/permission";
import type { ICategory, IProduct } from "@/types/product";

/**
 * Mock data factories for testing
 */

export const mockUserFactory = (overrides?: Partial<IUser>): IUser => ({
	id: 1,
	uuid: "user-uuid-1",
	email: "test@example.com",
	fullname: "Test User",
	role: "member",
	age: 25,
	status: "active",
	level: "Member",
	permissions: ["users.read", "users.create"],
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
	...overrides,
});

export const mockProductFactory = (
	overrides?: Partial<IProduct>,
): IProduct => ({
	id: 1,
	uuid: "prod-uuid-1",
	name: "Test Product",
	description: "Test Description",
	price: 100000,
	stock: 50,
	status: 1,
	category_id: 1,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
	...overrides,
});

export const mockCategoryFactory = (
	overrides?: Partial<ICategory>,
): ICategory => ({
	id: 1,
	name: "Test Category",
	description: "Test Category Description",
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
	...overrides,
});

export const mockPermissionFactory = (
	overrides?: Partial<IPermission>,
): IPermission => ({
	id: 1,
	uuid: "perm-uuid-1",
	resource: "users",
	action: "read",
	name: "Read Users",
	description: "Permission to read users",
	status: 1,
	...overrides,
});

export const mockRoleFactory = (overrides?: Partial<IRole>): IRole => ({
	id: 1,
	uuid: "role-uuid-1",
	name: "Admin",
	description: "Administrator role",
	permissions: [],
	status: 1,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
	...overrides,
});

/**
 * Generate mock list data
 */
export const generateMockList = <T>(
	factory: (index: number) => T,
	count = 10,
): T[] => {
	return Array.from({ length: count }, (_, i) => factory(i));
};

/**
 * Generate mock users
 */
export const generateMockUsers = (count = 10): IUser[] => {
	return generateMockList(
		(i) =>
			mockUserFactory({
				id: i + 1,
				uuid: `user-uuid-${i + 1}`,
				email: `user${i + 1}@example.com`,
				fullname: `User ${i + 1}`,
			}),
		count,
	);
};

/**
 * Generate mock products
 */
export const generateMockProducts = (count = 10): IProduct[] => {
	return generateMockList(
		(i) =>
			mockProductFactory({
				id: i + 1,
				name: `Product ${i + 1}`,
				price: (i + 1) * 10000,
				stock: (i + 1) * 5,
			}),
		count,
	);
};
