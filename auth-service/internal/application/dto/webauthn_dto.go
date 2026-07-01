package dto

type WebAuthnBeginRegistrationInput struct {
	UserUUID  string
	SessionID string // caller-generated UUID for keying the challenge in Redis
}

type WebAuthnBeginRegistrationOutput struct {
	OptionsJSON []byte // PublicKeyCredentialCreationOptions JSON → sent to browser
}

type WebAuthnFinishRegistrationInput struct {
	UserUUID        string
	SessionID       string
	RawResponseJSON []byte // PublicKeyCredential JSON from browser
}

type WebAuthnBeginLoginInput struct {
	Email     string
	SessionID string
}

type WebAuthnBeginLoginOutput struct {
	OptionsJSON []byte // PublicKeyCredentialRequestOptions JSON → sent to browser
}

type WebAuthnFinishLoginInput struct {
	Email           string
	SessionID       string
	RawResponseJSON []byte // PublicKeyCredential JSON from browser
}
