package bootstrap

import (
	authzpb "github.com/tumlumtala/contracts/generated/authorization"
	grpcadapter "github.com/tumlumtala/authorization-service/internal/adapter/grpc"
	"github.com/tumlumtala/authorization-service/internal/application/usecase"
	mysqlquery "github.com/tumlumtala/authorization-service/internal/infrastructure/persistence/queryservice"
	redisinfra "github.com/tumlumtala/authorization-service/internal/infrastructure/redis"
	"github.com/redis/go-redis/v9"
	"google.golang.org/grpc"
	"gorm.io/gorm"
)

func Register(server *grpc.Server, db *gorm.DB, redisClient *redis.Client) {
	permQuery := mysqlquery.NewMySQLPermissionQuery(db)
	permCache := redisinfra.NewPermissionCache(redisClient)
	checkUC := usecase.NewCheckUseCase(permQuery, permCache)
	controller := grpcadapter.NewAuthorizationController(checkUC)
	authzpb.RegisterAuthorizationServiceServer(server, controller)
}
