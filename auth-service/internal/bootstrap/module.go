package bootstrap

import (
	"log"

	"github.com/redis/go-redis/v9"
	grpcadapter "github.com/tumlumtala/auth-service/internal/adapter/grpc"
	"github.com/tumlumtala/auth-service/internal/application/usecase"
	jwtinfra "github.com/tumlumtala/auth-service/internal/infrastructure/jwt"
	"github.com/tumlumtala/auth-service/internal/infrastructure/password"
	"github.com/tumlumtala/auth-service/internal/infrastructure/persistence/queryservice"
	redisinfra "github.com/tumlumtala/auth-service/internal/infrastructure/redis"
	webauthninfra "github.com/tumlumtala/auth-service/internal/infrastructure/webauthn"
	authpb "github.com/tumlumtala/contracts/generated/auth"
	"google.golang.org/grpc"
	"gorm.io/gorm"
)

func Register(server *grpc.Server, db *gorm.DB, redisClient *redis.Client, jwtSecret string) {
	userQuery := queryservice.NewMySQLUserQueryRepository(db)
	credStore := queryservice.NewMySQLWebAuthnCredentialStore(db)
	sessionStore := redisinfra.NewSessionStore(redisClient)
	challengeStore := redisinfra.NewWebAuthnChallengeStore(redisClient)
	tokenVersionStore := redisinfra.NewTokenVersionStore(redisClient)
	tokenIssuer := jwtinfra.NewIssuer(jwtSecret)
	pwVerifier := password.NewBcryptVerifier()

	waSvc, err := webauthninfra.NewService()
	if err != nil {
		log.Fatalf("webauthn init: %v", err)
	}

	controller := grpcadapter.NewAuthController(
		usecase.NewLoginUseCase(userQuery, sessionStore, tokenVersionStore, tokenIssuer, pwVerifier),
		usecase.NewRefreshTokenUseCase(userQuery, sessionStore, tokenVersionStore, tokenIssuer),
		usecase.NewLogoutUseCase(sessionStore, tokenIssuer),
		usecase.NewWebAuthnRegistrationUseCase(userQuery, credStore, challengeStore, waSvc),
		usecase.NewWebAuthnLoginUseCase(userQuery, credStore, challengeStore, sessionStore, tokenVersionStore, tokenIssuer, waSvc),
	)

	authpb.RegisterAuthServiceServer(server, controller)
}
