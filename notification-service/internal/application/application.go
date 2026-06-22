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
	conn, err := rabbitmq.Dial(a.cfg.RabbitMQ)
	if err != nil {
		return fmt.Errorf("connect rabbitmq worker: %w", err)
	}

	notificationProcessor := processor.NewNotificationProcessor(a.factory)
	consumer, err := rabbitmq.NewConsumer(conn, a.cfg.RabbitMQ, a.publisher, notificationProcessor, a.log)
	if err != nil {
		_ = conn.Close()
		return fmt.Errorf("create rabbitmq consumer: %w", err)
	}
	defer consumer.Close()

	a.log.Info().Int("workers", a.cfg.RabbitMQ.Workers).Msg("notification worker started")
	err = consumer.Run(ctx)
	if errors.Is(err, context.Canceled) {
		return nil
	}
	return err
}

func (a *Application) Close() error {
	if a.publisher != nil {
		return a.publisher.Close()
	}
	return nil
}
