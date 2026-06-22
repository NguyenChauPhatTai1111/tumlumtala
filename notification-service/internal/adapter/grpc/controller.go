package grpcadapter

import (
	"context"

	notificationpb "github.com/tumlumtala/contracts/generated/notification"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"tumlumtala/notification-service/internal/modules/notification/domain"
	"tumlumtala/notification-service/internal/modules/notification/usecase"
)

type NotificationController struct {
	notificationpb.UnimplementedNotificationServiceServer
	send      *usecase.SendNotificationUseCase
	replayDLQ *usecase.ReplayDLQUseCase
}

func NewNotificationController(send *usecase.SendNotificationUseCase, replayDLQ *usecase.ReplayDLQUseCase) *NotificationController {
	return &NotificationController{send: send, replayDLQ: replayDLQ}
}

func (c *NotificationController) Send(ctx context.Context, req *notificationpb.SendNotificationRequest) (*notificationpb.SendNotificationResponse, error) {
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

	return &notificationpb.SendNotificationResponse{
		Id:      notification.ID,
		Status:  domain.StatusQueued.String(),
		Channel: notification.Channel.String(),
	}, nil
}

func (c *NotificationController) ReplayDLQ(ctx context.Context, req *notificationpb.ReplayDLQRequest) (*notificationpb.ReplayDLQResponse, error) {
	replayed, err := c.replayDLQ.Execute(ctx, int(req.GetLimit()))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "replay dlq failed: %v", err)
	}
	return &notificationpb.ReplayDLQResponse{Replayed: int32(replayed)}, nil
}
