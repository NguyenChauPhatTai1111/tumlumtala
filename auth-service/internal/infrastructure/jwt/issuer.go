package jwt

import (
	"time"

	jwtlib "github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/tumlumtala/auth-service/internal/domain/entity"
)

const (
	accessTokenTTL  = 15 * time.Minute
	refreshTokenTTL = 7 * 24 * time.Hour
)

type Issuer struct {
	secret []byte
}

func NewIssuer(secret string) *Issuer {
	return &Issuer{secret: []byte(secret)}
}

type accessClaims struct {
	UserID       string `json:"user_id"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	TokenType    string `json:"token_type"`
	TokenVersion int64  `json:"token_version"`
	jwtlib.RegisteredClaims
}

type refreshClaims struct {
	UserUUID string `json:"user_uuid"`
	jwtlib.RegisteredClaims
}

// IssuedClaims chứa jti và thời gian expire để caller dùng khi lưu session/blacklist.
type IssuedClaims struct {
	JTI       string
	ExpiresAt time.Time
}

func (i *Issuer) IssueAccessToken(user *entity.User, tokenVersion int64) (string, IssuedClaims, error) {
	now := time.Now()
	jti := uuid.NewString()
	exp := now.Add(accessTokenTTL)
	claims := accessClaims{
		UserID:       user.UUID,
		Email:        user.Email,
		Role:         user.Role,
		TokenType:    "access",
		TokenVersion: tokenVersion,
		RegisteredClaims: jwtlib.RegisteredClaims{
			ID:        jti,
			IssuedAt:  jwtlib.NewNumericDate(now),
			ExpiresAt: jwtlib.NewNumericDate(exp),
		},
	}
	token, err := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims).SignedString(i.secret)
	return token, IssuedClaims{JTI: jti, ExpiresAt: exp}, err
}

// ParseRefreshJTI xác thực chữ ký và trả về jti của refresh token.
func (i *Issuer) ParseRefreshJTI(tokenStr string) (string, error) {
	claims := &refreshClaims{}
	token, err := jwtlib.ParseWithClaims(tokenStr, claims, func(t *jwtlib.Token) (any, error) {
		return i.secret, nil
	})
	if err != nil || !token.Valid {
		return "", err
	}
	return claims.ID, nil
}

func (i *Issuer) IssueRefreshToken(user *entity.User) (string, IssuedClaims, error) {
	now := time.Now()
	jti := uuid.NewString()
	exp := now.Add(refreshTokenTTL)
	claims := refreshClaims{
		UserUUID: user.UUID,
		RegisteredClaims: jwtlib.RegisteredClaims{
			ID:        jti,
			IssuedAt:  jwtlib.NewNumericDate(now),
			ExpiresAt: jwtlib.NewNumericDate(exp),
		},
	}
	token, err := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims).SignedString(i.secret)
	return token, IssuedClaims{JTI: jti, ExpiresAt: exp}, err
}
