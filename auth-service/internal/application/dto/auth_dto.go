package dto

type LoginInput struct {
	Email    string
	Password string
}

type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

type RefreshInput struct {
	RefreshToken string
}

type LogoutInput struct {
	RefreshToken string
}
