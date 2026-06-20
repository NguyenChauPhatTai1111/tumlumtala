package jwt

import (
	"crypto/rsa"
	"errors"
	"os"
	"strconv"
	"time"

	jwtlib "github.com/golang-jwt/jwt/v5"
	authdomain "github.com/tumlumtala/gateway/internal/modules/auth/domain"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
)

type Verifier struct {
	secret    []byte
	publicKey *rsa.PublicKey
	algorithm string
}

type accessClaims struct {
	UserID    any    `json:"user_id"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	TokenType string `json:"token_type"`
	jwtlib.RegisteredClaims
}

func NewVerifier(secret, publicKeyPath, algorithm string) (*Verifier, error) {
	v := &Verifier{secret: []byte(secret), algorithm: algorithm}
	if publicKeyPath == "" {
		return v, nil
	}

	content, err := os.ReadFile(publicKeyPath)
	if err != nil {
		return nil, err
	}
	key, err := jwtlib.ParseRSAPublicKeyFromPEM(content)
	if err != nil {
		return nil, err
	}
	v.publicKey = key
	return v, nil
}

func (v *Verifier) Verify(accessToken string) (authdomain.AccessClaims, error) {
	claims := &accessClaims{}
	token, err := jwtlib.ParseWithClaims(accessToken, claims, func(token *jwtlib.Token) (any, error) {
		if token.Method.Alg() != v.algorithm {
			return nil, errors.New("unexpected jwt signing method")
		}
		if v.publicKey != nil {
			return v.publicKey, nil
		}
		return v.secret, nil
	})
	if err != nil || token == nil || !token.Valid {
		return authdomain.AccessClaims{}, apperrors.New(apperrors.CodeUnauthorized, "unauthorized", err)
	}
	if claims.TokenType != "access" {
		return authdomain.AccessClaims{}, apperrors.New(apperrors.CodeUnauthorized, "invalid token type", errors.New("token_type is not access"))
	}
	if claims.ExpiresAt == nil || claims.ExpiresAt.Before(time.Now()) {
		return authdomain.AccessClaims{}, apperrors.New(apperrors.CodeUnauthorized, "token expired", errors.New("expired access token"))
	}

	issuedAt := time.Time{}
	if claims.IssuedAt != nil {
		issuedAt = claims.IssuedAt.Time
	}

	return authdomain.AccessClaims{
		UserID:    normalizeUserID(claims.UserID),
		Email:     claims.Email,
		Role:      claims.Role,
		TokenType: claims.TokenType,
		IssuedAt:  issuedAt,
		ExpiresAt: claims.ExpiresAt.Time,
	}, nil
}

func normalizeUserID(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case float64:
		return strconv.FormatInt(int64(typed), 10)
	case int64:
		return strconv.FormatInt(typed, 10)
	case int:
		return strconv.Itoa(typed)
	default:
		return ""
	}
}
