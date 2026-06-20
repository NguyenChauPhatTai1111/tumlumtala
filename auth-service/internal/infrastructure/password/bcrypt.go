package password

import "golang.org/x/crypto/bcrypt"

type BcryptVerifier struct{}

func NewBcryptVerifier() *BcryptVerifier { return &BcryptVerifier{} }

func (v *BcryptVerifier) Verify(hashed, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashed), []byte(plain)) == nil
}
