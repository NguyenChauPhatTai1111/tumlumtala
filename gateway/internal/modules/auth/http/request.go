package http

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type WebAuthnBeginRegistrationRequest struct {
	UserUUID  string `json:"user_uuid" binding:"required"`
	SessionID string `json:"session_id" binding:"required"`
}

type WebAuthnFinishRegistrationRequest struct {
	UserUUID  string `json:"user_uuid" binding:"required"`
	SessionID string `json:"session_id" binding:"required"`
	// credential is arbitrary JSON from the browser — keep as raw message
	Credential interface{} `json:"credential" binding:"required"`
}

type WebAuthnBeginLoginRequest struct {
	Email     string `json:"email" binding:"required,email"`
	SessionID string `json:"session_id" binding:"required"`
}

type WebAuthnFinishLoginRequest struct {
	Email      string      `json:"email" binding:"required,email"`
	SessionID  string      `json:"session_id" binding:"required"`
	Credential interface{} `json:"credential" binding:"required"`
}
