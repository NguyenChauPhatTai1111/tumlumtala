package domain

type CreateUserInput struct {
	Email    string
	Password string
	Fullname string
}

type UpdateUserInput struct {
	UUID     string
	Email    string
	Fullname string
	Role     string
}

type User struct {
	ID        string
	UUID      string
	Email     string
	Fullname  string
	Avatar    string
	Role      string
	CreatedAt string
	UpdatedAt string
}

type UpdateProfileInput struct {
	UUID     string
	Email    string
	Fullname string
	Avatar   string
}

type ListUsersInput struct {
	Limit  int32
	Offset int32
}

type ListUsersResult struct {
	Users []User
	Total int64
}
