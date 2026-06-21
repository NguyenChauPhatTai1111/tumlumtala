package jwt

import (
	"context"
	"crypto/rsa"
	"errors"
	"os"
	"strconv"
	"time"

	jwtlib "github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	authdomain "github.com/tumlumtala/gateway/internal/modules/auth/domain"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
)

const (
	blacklistPrefix    = "blacklist:"
	tokenVersionPrefix = "token_version:"
)

type Verifier struct {
	secret    []byte
	publicKey *rsa.PublicKey
	algorithm string
	redis     *redis.Client
}

type accessClaims struct {
	UserID       any    `json:"user_id"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	TokenType    string `json:"token_type"`
	TokenVersion int64  `json:"token_version"`
	jwtlib.RegisteredClaims
}

func NewVerifier(secret, publicKeyPath, algorithm string, redisClient *redis.Client) (*Verifier, error) {
	v := &Verifier{secret: []byte(secret), algorithm: algorithm, redis: redisClient}
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

func (v *Verifier) Verify(ctx context.Context, accessToken string) (authdomain.AccessClaims, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	claims := &accessClaims{}
	token, err := jwtlib.ParseWithClaims(accessToken, claims, func(t *jwtlib.Token) (any, error) {
		if t.Method.Alg() != v.algorithm {
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

	jti := claims.ID
	userID := normalizeUserID(claims.UserID)

	// O(1): check jti blacklist
	if jti != "" {
		blocked, err := v.isBlacklisted(ctx, jti)
		if err != nil {
			return authdomain.AccessClaims{}, apperrors.New(apperrors.CodeUnauthorized, "unauthorized", err)
		}
		if blocked {
			return authdomain.AccessClaims{}, apperrors.New(apperrors.CodeUnauthorized, "token revoked", errors.New("jti blacklisted"))
		}
	}

	// check token_version: version trong token < version hiện tại → đã bị kick
	currentVersion, err := v.getTokenVersion(ctx, userID)
	if err != nil {
		return authdomain.AccessClaims{}, apperrors.New(apperrors.CodeUnauthorized, "unauthorized", err)
	}
	if claims.TokenVersion < currentVersion {
		return authdomain.AccessClaims{}, apperrors.New(apperrors.CodeUnauthorized, "token invalidated", errors.New("token_version outdated"))
	}

	issuedAt := time.Time{}
	if claims.IssuedAt != nil {
		issuedAt = claims.IssuedAt.Time
	}

	return authdomain.AccessClaims{
		UserID:       userID,
		Email:        claims.Email,
		Role:         claims.Role,
		TokenType:    claims.TokenType,
		TokenVersion: claims.TokenVersion,
		JTI:          jti,
		IssuedAt:     issuedAt,
		ExpiresAt:    claims.ExpiresAt.Time,
	}, nil
}

func (v *Verifier) isBlacklisted(ctx context.Context, jti string) (bool, error) {
	err := v.redis.Get(ctx, blacklistPrefix+jti).Err()
	if err == nil {
		return true, nil
	}
	if err == redis.Nil {
		return false, nil
	}
	return false, err
}

func (v *Verifier) getTokenVersion(ctx context.Context, userID string) (int64, error) {
	if userID == "" {
		return 0, nil
	}
	val, err := v.redis.Get(ctx, tokenVersionPrefix+userID).Result()
	if err == redis.Nil {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return strconv.ParseInt(val, 10, 64)
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
