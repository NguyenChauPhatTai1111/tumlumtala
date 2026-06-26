package domain

type CreateUserInput struct {
	Email    string
	Password string
	Fullname string
	Role     string
	Status   string
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
	Status    string
	CreatedAt string
	UpdatedAt string
}

type ChangeUserStatusInput struct {
	UUID   string
	Status string
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
	Search string
}

type ListUsersResult struct {
	Users []User
	Total int64
}
