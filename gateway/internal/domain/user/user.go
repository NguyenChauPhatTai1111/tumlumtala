package user

type CreateUserInput struct {
	Email    string
	Password string
	Fullname string
}

type User struct {
	ID       string
	Email    string
	Fullname string
}
