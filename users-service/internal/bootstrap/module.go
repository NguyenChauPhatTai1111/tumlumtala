package bootstrap

import (
	userpb "github.com/tumlumtala/contracts/generated/user"
	grpcadapter "github.com/tumlumtala/users-service/internal/adapter/grpc"
	"github.com/tumlumtala/users-service/internal/application/usecase"
	mysqlquery "github.com/tumlumtala/users-service/internal/infrastructure/persistence/queryservice"
	mysqlrepo "github.com/tumlumtala/users-service/internal/infrastructure/persistence/repository"
	"google.golang.org/grpc"
	"gorm.io/gorm"
)

func Register(server *grpc.Server, db *gorm.DB) {
	repository := mysqlrepo.NewMySQLUserRepository(db)
	queries := mysqlquery.NewMySQLUserQueryService(db)
	controller := grpcadapter.NewUserController(
		usecase.NewCreateUserUseCase(repository, queries),
		usecase.NewGetUserUseCase(queries),
		usecase.NewListUsersUseCase(queries),
		usecase.NewUpdateUserUseCase(repository, queries),
		usecase.NewDeleteUserUseCase(repository),
	)
	userpb.RegisterUserServiceServer(server, controller)
}
