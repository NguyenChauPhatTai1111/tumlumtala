package websocket

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// JWTValidator is a function that validates a JWT token string and returns the user ID.
type JWTValidator func(ctx context.Context, token string) (uint, error)

func ServeWS(
	pool *ConnectionPool,
	hub *Hub,
	handler MessageHandler,
	validateToken JWTValidator,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := Upgrade(w, r)
		if err != nil {
			return
		}

		token := r.Header.Get("Authorization")
		if strings.TrimSpace(token) == "" {
			token = r.URL.Query().Get("token")
		}
		token = strings.TrimSpace(token)
		if strings.HasPrefix(strings.ToLower(token), "bearer ") {
			token = strings.TrimSpace(token[7:])
		}

		if token == "" {
			_ = conn.Close()
			return
		}

		userID, err := validateToken(r.Context(), token)
		if err != nil || userID == 0 {
			_ = conn.Close()
			return
		}

		clientID := uuid.NewString()

		client := NewClient(
			context.Background(),
			clientID,
			userID,
			conn,
			pool,
			hub,
			handler,
		)

		pool.Add(client)
	}
}

// ParseUserIDFromToken parses a JWT token and extracts the user_id claim.
// jwtSecret is the HMAC secret used to sign tokens.
func ParseUserIDFromToken(jwtSecret string) JWTValidator {
	return func(_ context.Context, tokenStr string) (uint, error) {
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			return 0, jwt.ErrSignatureInvalid
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return 0, jwt.ErrTokenInvalidClaims
		}

		var userID uint
		switch v := claims["user_id"].(type) {
		case float64:
			userID = uint(v)
		case uint:
			userID = v
		}

		return userID, nil
	}
}
