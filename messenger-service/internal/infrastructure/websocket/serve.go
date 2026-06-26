package websocket

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
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

// ParseUserIDFromToken parses a JWT token whose user_id claim is a UUID string,
// then looks up the numeric user ID from user_snapshots.
//
// Self-healing: if the user exists in the JWT but not yet in user_snapshots
// (e.g. after a fresh deploy before Kafka consumer has synced), the snapshot
// is upserted on-the-fly from JWT claims so the connection never fails due to
// a missing sync. This eliminates the need to run the seeder or wait for Kafka
// before users can connect via WebSocket.
func ParseUserIDFromToken(jwtSecret string, db *gorm.DB) JWTValidator {
	return func(ctx context.Context, tokenStr string) (uint, error) {
		tokenStr = strings.TrimSpace(tokenStr)
		if strings.HasPrefix(strings.ToLower(tokenStr), "bearer ") {
			tokenStr = strings.TrimSpace(tokenStr[7:])
		}

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

		uuidStr, _ := claims["user_id"].(string)
		if uuidStr == "" {
			return 0, jwt.ErrTokenInvalidClaims
		}

		var row struct {
			ID     uint   `gorm:"column:id"`
			Status string `gorm:"column:status"`
		}
		err = db.WithContext(ctx).
			Raw("SELECT id, status FROM user_snapshots WHERE uuid = ? LIMIT 1", uuidStr).
			Scan(&row).Error
		if err != nil {
			return 0, err
		}

		if row.ID != 0 && row.Status == "active" {
			return row.ID, nil
		}
		if row.ID != 0 {
			return 0, jwt.ErrTokenInvalidClaims
		}

		// Snapshot missing — upsert from JWT claims so the connection succeeds
		// immediately without waiting for Kafka or a manual seeder run.
		email, _ := claims["email"].(string)
		role, _ := claims["role"].(string)
		if role == "" {
			role = "member"
		}

		now := time.Now().UTC()
		if err := db.WithContext(ctx).Exec(`
			INSERT INTO user_snapshots (uuid, email, fullname, avatar, role, status, created_at, updated_at)
			VALUES (?, ?, '', '', ?, 'active', ?, ?)
			ON DUPLICATE KEY UPDATE
				email      = VALUES(email),
				role       = VALUES(role),
				status     = VALUES(status),
				updated_at = VALUES(updated_at)
		`, uuidStr, email, role, now, now).Error; err != nil {
			return 0, err
		}

		// Re-fetch the auto-assigned ID.
		if err := db.WithContext(ctx).
			Raw("SELECT id, status FROM user_snapshots WHERE uuid = ? LIMIT 1", uuidStr).
			Scan(&row).Error; err != nil || row.ID == 0 {
			return 0, jwt.ErrTokenInvalidClaims
		}
		if row.Status != "active" {
			return 0, jwt.ErrTokenInvalidClaims
		}

		return row.ID, nil
	}
}
