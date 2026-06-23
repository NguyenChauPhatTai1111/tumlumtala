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
	cfg       config.Config          // Toàn bộ config của notification-service
	log       zerolog.Logger         // Logger dùng chung trong application
	publisher *rabbitmq.Publisher    // Publisher dùng bởi gRPC API để enqueue notification
	factory   domain.ProviderFactory // Factory chứa các provider gửi notification theo channel
}

func New(cfg config.Config) (*Application, error) {

	// Chọn output log theo config:
	// production thường dùng json, local dev có thể dùng text
	output := "json"
	if !cfg.Log.JSON {
		output = "text"
	}

	// Khởi tạo structured logger cho service
	log := sharedlogger.New(sharedlogger.Config{
		Service:     cfg.App.Name,
		Level:       cfg.Log.Level,
		Output:      output,
		Environment: cfg.App.Env,
	})

	// Mở connection RabbitMQ dùng cho publisher của gRPC API
	conn, err := rabbitmq.Dial(cfg.RabbitMQ)
	if err != nil {
		return nil, fmt.Errorf("connect rabbitmq: %w", err)
	}

	// Publisher sẽ publish notification/retry/DLQ message vào RabbitMQ
	publisher, err := rabbitmq.NewPublisher(conn, cfg.RabbitMQ)
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("create rabbitmq publisher: %w", err)
	}

	// Đăng ký các provider gửi notification theo từng channel
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

	// Use case cho API gửi notification:
	// nhận request từ service khác và enqueue vào RabbitMQ
	sendUC := usecase.NewSendNotificationUseCase(a.publisher)

	// Use case cho API replay DLQ thủ công
	replayUC := usecase.NewReplayDLQUseCase(a.publisher)

	// Lắng nghe TCP port để chạy gRPC server
	listener, err := net.Listen("tcp", fmt.Sprintf(":%d", a.cfg.App.Port))
	if err != nil {
		return err
	}

	// Khởi tạo gRPC server
	server := grpc.NewServer()

	// Register notification gRPC service
	notificationpb.RegisterNotificationServiceServer(server, grpcadapter.NewNotificationController(sendUC, replayUC))

	// Register health check endpoint cho container/Kubernetes/service discovery
	healthServer := health.NewServer()
	healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	healthpb.RegisterHealthServer(server, healthServer)

	errCh := make(chan error, 1)
	// Chạy gRPC server trong goroutine để main goroutine có thể lắng nghe shutdown signal
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
	// Khởi tạo command consumer xử lý notification command queue.
	commandConsumer, err := a.newCommandConsumer()
	if err != nil {
		return err
	}
	defer commandConsumer.Close()

	// Khởi tạo event consumer xử lý domain event queue.
	eventConsumer, err := a.newEventConsumer()
	if err != nil {
		return err
	}
	defer eventConsumer.Close()

	// Log một lần tại orchestration layer để thấy cả command queue và event queue.
	a.log.Info().
		Int("workers", a.cfg.RabbitMQ.Workers).
		Str("command_queue", a.cfg.RabbitMQ.Queue).
		Str("event_queue", a.cfg.RabbitMQ.EventQueue).
		Msg("notification worker started")

	return a.runConsumers(ctx, commandConsumer, eventConsumer)
}

func (a *Application) newCommandConsumer() (*rabbitmq.Consumer, error) {
	// Mở connection tới RabbitMQ server cho worker.
	conn, err := rabbitmq.Dial(a.cfg.RabbitMQ)
	if err != nil {
		return nil, fmt.Errorf("connect rabbitmq worker: %w", err)
	}

	// Adapter Processor chọn provider phù hợp theo notification channel.
	notificationProcessor := processor.NewNotificationProcessor(a.factory)

	// Khởi tạo consumer để consume message từ queue chính
	consumer, err := rabbitmq.NewConsumer(conn, a.cfg.RabbitMQ, a.publisher, notificationProcessor, a.log)
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("create rabbitmq consumer: %w", err)
	}
	return consumer, nil
}

func (a *Application) newEventConsumer() (*rabbitmq.EventConsumer, error) {
	// Mở connection riêng cho event worker để không chia sẻ channel/consumer với command worker.
	eventConn, err := rabbitmq.Dial(a.cfg.RabbitMQ)
	if err != nil {
		return nil, fmt.Errorf("connect rabbitmq event worker: %w", err)
	}

	// Event handler chỉ translate domain event thành notification command.
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
	// Router map routing key -> handler riêng, tránh giant switch khi thêm event mới.
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
		// Mỗi consumer chạy trong goroutine riêng để command queue và event queue hoạt động song song.
		go func(consumer workerConsumer) {
			errCh <- consumer.Run(ctx)
		}(consumer)
	}

	for range consumers {
		err := <-errCh
		// Shutdown bình thường qua context không được xem là lỗi worker.
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
