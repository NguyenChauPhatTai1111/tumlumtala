package grpcadapter

import (
	"context"

	"tumlumtala/notification-service/internal/modules/notification/domain"
	"tumlumtala/notification-service/internal/modules/notification/usecase"

	notificationpb "github.com/tumlumtala/contracts/generated/notification"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type NotificationController struct {
	notificationpb.UnimplementedNotificationServiceServer
	
	send      *usecase.SendNotificationUseCase	// Use case dùng để enqueue notification vào RabbitMQ

	replayDLQ *usecase.ReplayDLQUseCase 	// Use case dùng để replay message từ DLQ về queue chính
}

func NewNotificationController(send *usecase.SendNotificationUseCase, replayDLQ *usecase.ReplayDLQUseCase) *NotificationController {
	return &NotificationController{send: send, replayDLQ: replayDLQ}
}

func (c *NotificationController) Send(ctx context.Context, req *notificationpb.SendNotificationRequest) (*notificationpb.SendNotificationResponse, error) {

	// Convert protobuf request sang usecase input/domain value
	notification, err := c.send.Execute(ctx, usecase.SendNotificationInput{
		Channel:   domain.Channel(req.GetChannel()),
		Type:      req.GetType(),
		Recipient: req.GetRecipient(),
		Subject:   req.GetSubject(),
		Message:   req.GetMessage(),
		Template:  req.GetTemplate(),
		Data:      req.GetData(),
		Metadata:  req.GetMetadata(),
	})
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	// Trả response queued vì notification mới chỉ được đưa vào RabbitMQ,
	// chưa chắc đã gửi email/sms/zalo thành công ngay tại thời điểm này.

	return &notificationpb.SendNotificationResponse{
		Id:      notification.ID,
		Status:  domain.StatusQueued.String(),
		Channel: notification.Channel.String(),
	}, nil
}

func (c *NotificationController) ReplayDLQ(ctx context.Context, req *notificationpb.ReplayDLQRequest) (*notificationpb.ReplayDLQResponse, error) {
	// Replay tối đa req.Limit message từ DLQ về queue chính
	replayed, err := c.replayDLQ.Execute(ctx, int(req.GetLimit()))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "replay dlq failed: %v", err)
	}
	// Trả về số lượng message đã replay thành công
	return &notificationpb.ReplayDLQResponse{Replayed: int32(replayed)}, nil
}
