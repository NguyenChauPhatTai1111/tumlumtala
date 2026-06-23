package application

import (
	"context"
	"errors"
	"fmt"
	"net"

	grpcadapter "tumlumtala/notification-service/internal/adapter/grpc"
	"tumlumtala/notification-service/internal/config"
	"tumlumtala/notification-service/internal/infrastructure/rabbitmq"
	"tumlumtala/notification-service/internal/modules/notification/domain"
	"tumlumtala/notification-service/internal/modules/notification/handler/eventhandler"
	"tumlumtala/notification-service/internal/modules/notification/provider/email"
	providerfactory "tumlumtala/notification-service/internal/modules/notification/provider/factory"
	"tumlumtala/notification-service/internal/modules/notification/provider/sms"
	"tumlumtala/notification-service/internal/modules/notification/provider/webhook"
	"tumlumtala/notification-service/internal/modules/notification/provider/zalo"
	"tumlumtala/notification-service/internal/modules/notification/usecase"
	"tumlumtala/notification-service/internal/modules/notification/worker/processor"
	sharedlogger "tumlumtala/notification-service/internal/shared/logger"

	"github.com/rs/zerolog"
	notificationpb "github.com/tumlumtala/contracts/generated/notification"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
)

type Application struct {
	cfg       config.Config
	log       zerolog.Logger
	publisher *rabbitmq.Publisher
	factory   domain.ProviderFactory
}

func New(cfg config.Config) (*Application, error) {
	output := "json"
	if !cfg.Log.JSON {
		output = "text"
	}

	log := sharedlogger.New(sharedlogger.Config{
		Service:     cfg.App.Name,
		Level:       cfg.Log.Level,
		Output:      output,
		Environment: cfg.App.Env,
	})

	conn, err := rabbitmq.Dial(cfg.RabbitMQ)
	if err != nil {
		return nil, fmt.Errorf("connect rabbitmq: %w", err)
	}

	publisher, err := rabbitmq.NewPublisher(conn, cfg.RabbitMQ)
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("create rabbitmq publisher: %w", err)
	}

	factory := providerfactory.New(map[domain.Channel]domain.Provider{
		domain.ChannelEmail:   email.New(cfg.SMTP),
		domain.ChannelAlert:   processor.NewAlertProvider(log),
		domain.ChannelZalo:    zalo.New(cfg.Zalo.Endpoint, cfg.Zalo.Token),
		domain.ChannelSMS:     sms.New(),
		domain.ChannelWebhook: webhook.New(),
	})

	return &Application{
		cfg:       cfg,
		log:       log,
		publisher: publisher,
		factory:   factory,
	}, nil
}

func (a *Application) StartGRPC(ctx context.Context) error {
	sendUC := usecase.NewSendNotificationUseCase(a.publisher)
	replayUC := usecase.NewReplayDLQUseCase(a.publisher)

	listener, err := net.Listen("tcp", fmt.Sprintf(":%d", a.cfg.App.Port))
	if err != nil {
		return err
	}

	server := grpc.NewServer()
	notificationpb.RegisterNotificationServiceServer(server, grpcadapter.NewNotificationController(sendUC, replayUC))

	healthServer := health.NewServer()
	healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	healthpb.RegisterHealthServer(server, healthServer)

	errCh := make(chan error, 1)
	go func() {
		a.log.Info().Int("port", a.cfg.App.Port).Msg("notification grpc api started")
		errCh <- server.Serve(listener)
	}()

	select {
	case <-ctx.Done():
		server.GracefulStop()
		return ctx.Err()
	case err := <-errCh:
		return err
	}
}

func (a *Application) StartWorker(ctx context.Context) error {
	commandConsumer, err := a.newCommandConsumer()
	if err != nil {
		return err
	}
	defer commandConsumer.Close()

	eventConsumer, err := a.newEventConsumer()
	if err != nil {
		return err
	}
	defer eventConsumer.Close()

	a.log.Info().
		Int("workers", a.cfg.RabbitMQ.Workers).
		Str("command_queue", a.cfg.RabbitMQ.Queue).
		Str("event_queue", a.cfg.RabbitMQ.EventQueue).
		Msg("notification worker started")

	return a.runConsumers(ctx, commandConsumer, eventConsumer)
}

func (a *Application) newCommandConsumer() (*rabbitmq.Consumer, error) {
	conn, err := rabbitmq.Dial(a.cfg.RabbitMQ)
	if err != nil {
		return nil, fmt.Errorf("connect rabbitmq worker: %w", err)
	}

	notificationProcessor := processor.NewNotificationProcessor(a.factory)
	consumer, err := rabbitmq.NewConsumer(conn, a.cfg.RabbitMQ, a.publisher, notificationProcessor, a.log)
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("create rabbitmq consumer: %w", err)
	}
	return consumer, nil
}

func (a *Application) newEventConsumer() (*rabbitmq.EventConsumer, error) {
	eventConn, err := rabbitmq.Dial(a.cfg.RabbitMQ)
	if err != nil {
		return nil, fmt.Errorf("connect rabbitmq event worker: %w", err)
	}

	sendUC := usecase.NewSendNotificationUseCase(a.publisher)
	router := a.newEventRouter(sendUC)

	eventConsumer, err := rabbitmq.NewEventConsumer(eventConn, a.cfg.RabbitMQ, router, a.log)
	if err != nil {
		_ = eventConn.Close()
		return nil, fmt.Errorf("create rabbitmq event consumer: %w", err)
	}
	return eventConsumer, nil
}

func (a *Application) newEventRouter(sendUC *usecase.SendNotificationUseCase) *eventhandler.Router {
	router := eventhandler.NewRouter()
	userCreatedHandler := eventhandler.NewUserCreatedHandler(sendUC)
	router.Register("user.created", userCreatedHandler.Handle)
	return router
}

type workerConsumer interface {
	Run(context.Context) error
}

func (a *Application) runConsumers(ctx context.Context, consumers ...workerConsumer) error {
	errCh := make(chan error, len(consumers))
	for _, consumer := range consumers {
		go func(consumer workerConsumer) {
			errCh <- consumer.Run(ctx)
		}(consumer)
	}

	for range consumers {
		err := <-errCh
		if errors.Is(err, context.Canceled) {
			continue
		}
		return err
	}
	return nil
}

func (a *Application) Close() error {
	if a.publisher != nil {
		return a.publisher.Close()
	}
	return nil
}
