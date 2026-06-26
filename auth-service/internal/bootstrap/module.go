package bootstrap

import (
	"github.com/redis/go-redis/v9"
	grpcadapter "github.com/tumlumtala/auth-service/internal/adapter/grpc"
	"github.com/tumlumtala/auth-service/internal/application/usecase"
	jwtinfra "github.com/tumlumtala/auth-service/internal/infrastructure/jwt"
	"github.com/tumlumtala/auth-service/internal/infrastructure/password"
	"github.com/tumlumtala/auth-service/internal/infrastructure/persistence/queryservice"
	redisinfra "github.com/tumlumtala/auth-service/internal/infrastructure/redis"
	authpb "github.com/tumlumtala/contracts/generated/auth"
	"google.golang.org/grpc"
	"gorm.io/gorm"
)

func Register(server *grpc.Server, db *gorm.DB, redisClient *redis.Client, jwtSecret string) {
	userQuery := queryservice.NewMySQLUserQueryRepository(db)
	sessionStore := redisinfra.NewSessionStore(redisClient)
	tokenVersionStore := redisinfra.NewTokenVersionStore(redisClient)
	tokenIssuer := jwtinfra.NewIssuer(jwtSecret)
	pwVerifier := password.NewBcryptVerifier()

	controller := grpcadapter.NewAuthController(
		usecase.NewLoginUseCase(userQuery, sessionStore, tokenVersionStore, tokenIssuer, pwVerifier),
		usecase.NewRefreshTokenUseCase(userQuery, sessionStore, tokenVersionStore, tokenIssuer),
		usecase.NewLogoutUseCase(sessionStore, tokenIssuer),
	)

	authpb.RegisterAuthServiceServer(server, controller)
}
