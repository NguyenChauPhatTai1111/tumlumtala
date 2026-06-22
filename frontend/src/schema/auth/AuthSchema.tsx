import * as yup from "yup";

export const registerSchema = yup.object({
	email: yup.string().required("Email là bắt buộc").email("Email không hợp lệ"),
	password: yup
		.string()
		.required("Password là bắt buộc")
		.min(6, "Ít nhất 6 ký tự"),
	confirmPassword: yup
		.string()
		.required("Xác nhận password là bắt buộc")
		.oneOf([yup.ref("password")], "Password không khớp"),
});

export const loginSchema = yup.object({
	email: yup.string().required("Email là bắt buộc").email("Email không hợp lệ"),
	password: yup
		.string()
		.required("Mật khẩu là bắt buộc")
		.min(6, "Mật khẩu ít nhất 6 ký tự"),
});

export const changePasswordSchema = yup.object({
	oldPassword: yup.string().required("Mật khẩu cũ không được để trống"),
	newPassword: yup
		.string()
		.required("Mật khẩu mới không được để trống")
		.min(6, "Mật khẩu mới phải có ít nhất 6 ký tự")
		.notOneOf([yup.ref("oldPassword")], "Mật khẩu mới phải khác mật khẩu cũ"),
	confirmPassword: yup
		.string()
		.required("Vui lòng xác nhận mật khẩu mới")
		.oneOf([yup.ref("newPassword")], "Mật khẩu xác nhận không khớp"),
});
