import * as yup from "yup";

export const editUserSchema = yup.object({
	fullname: yup
		.string()
		.required("Vui lòng nhập họ tên")
		.min(3, "Họ tên phải có ít nhất 3 ký tự")
		.max(50, "Họ tên không được vượt quá 50 ký tự"),

	email: yup
		.string()
		.required("Vui lòng nhập email")
		.email("Email không hợp lệ"),

	age: yup
		.number()
		.typeError("Tuổi phải là số")
		.required("Vui lòng nhập tuổi")
		.min(1, "Tuổi không được nhỏ hơn 0")
		.max(120, "Tuổi không hợp lệ"),

	gender: yup
		.string()
		.required("Vui lòng chọn giới tính")
		.oneOf(["male", "female", "other"], "Giới tính không hợp lệ"),

	status: yup
		.string()
		.required("Vui lòng chọn trạng thái")
		.oneOf(["Active", "Inactive", "Banned"], "Trạng thái không hợp lệ"),

	level: yup
		.string()
		.required("Vui lòng chọn cấp độ")
		.oneOf(["Administrator", "Moderator", "Member"], "Cấp độ không hợp lệ"),
});

export const createUserSchema = editUserSchema.shape({
	password: yup
		.string()
		.required("Vui lòng nhập mật khẩu")
		.min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});
