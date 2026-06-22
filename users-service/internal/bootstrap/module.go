package bootstrap

import (
	userpb "github.com/tumlumtala/contracts/generated/user"
	grpcadapter "github.com/tumlumtala/users-service/internal/adapter/grpc"
	"github.com/tumlumtala/users-service/internal/application/usecase"
	kafkainfra "github.com/tumlumtala/users-service/internal/infrastructure/kafka"
	mysqlquery "github.com/tumlumtala/users-service/internal/infrastructure/persistence/queryservice"
	mysqlrepo "github.com/tumlumtala/users-service/internal/infrastructure/persistence/repository"
	"google.golang.org/grpc"
	"gorm.io/gorm"
)

func Register(server *grpc.Server, db *gorm.DB, kafkaBrokers []string) {
	repository := mysqlrepo.NewMySQLUserRepository(db)
	queries := mysqlquery.NewMySQLUserQueryService(db)
	events := kafkainfra.NewEventPublisher(kafkaBrokers)

	controller := grpcadapter.NewUserController(
		usecase.NewCreateUserUseCase(repository, queries, events),
		usecase.NewGetUserUseCase(queries),
		usecase.NewListUsersUseCase(queries),
		usecase.NewUpdateUserUseCase(repository, queries, events),
		usecase.NewDeleteUserUseCase(repository, queries, events),
	)
	userpb.RegisterUserServiceServer(server, controller)
}
