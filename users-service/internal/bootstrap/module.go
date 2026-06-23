package bootstrap

import (
	"github.com/rs/zerolog"
	userpb "github.com/tumlumtala/contracts/generated/user"
	grpcadapter "github.com/tumlumtala/users-service/internal/adapter/grpc"
	"github.com/tumlumtala/users-service/internal/application/usecase"
	kafkainfra "github.com/tumlumtala/users-service/internal/infrastructure/kafka"
	mysqlquery "github.com/tumlumtala/users-service/internal/infrastructure/persistence/queryservice"
	mysqlrepo "github.com/tumlumtala/users-service/internal/infrastructure/persistence/repository"
	rabbitmqinfra "github.com/tumlumtala/users-service/internal/infrastructure/rabbitmq"
	"google.golang.org/grpc"
	"gorm.io/gorm"
)

func Register(server *grpc.Server, db *gorm.DB, kafkaBrokers []string, rabbitCfg rabbitmqinfra.Config, log zerolog.Logger) {
	repository := mysqlrepo.NewMySQLUserRepository(db)
	queries := mysqlquery.NewMySQLUserQueryService(db)
	kafkaEvents := kafkainfra.NewEventPublisher(kafkaBrokers)
	rabbitMQEvents := rabbitmqinfra.NewDomainEventPublisher(rabbitCfg, log)

	controller := grpcadapter.NewUserController(
		usecase.NewCreateUserUseCase(repository, queries, kafkaEvents).WithDomainEvents(rabbitMQEvents),
		usecase.NewGetUserUseCase(queries),
		usecase.NewListUsersUseCase(queries),
		usecase.NewUpdateUserUseCase(repository, queries, kafkaEvents),
		usecase.NewDeleteUserUseCase(repository, queries, kafkaEvents),
	)
	userpb.RegisterUserServiceServer(server, controller)
}
