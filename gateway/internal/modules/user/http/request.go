package http

type CreateUserRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
	Fullname string `json:"fullname" binding:"required"`
	Role     string `json:"role"`
	Status   string `json:"status"`
}

type UpdateUserRequest struct {
	Email    string `json:"email" binding:"omitempty,email"`
	Fullname string `json:"fullname"`
	Role     string `json:"role"`
}

type UpdateProfileRequest struct {
	Email    string `json:"email" binding:"omitempty,email"`
	Fullname string `json:"fullname"`
	Avatar   string `json:"avatar"`
}

type ChangeUserStatusRequest struct {
	Status string `json:"status" binding:"required"`
}
