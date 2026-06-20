package user

type CreateUserInput struct {
	Email    string
	Password string
	Fullname string
}

type User struct {
	ID       uint64
	Email    string
	Fullname string
}
