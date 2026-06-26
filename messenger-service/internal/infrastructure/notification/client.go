package notification

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	notificationpb "github.com/tumlumtala/contracts/generated/notification"
	"github.com/tumlumtala/messenger-service/internal/config"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type IncomingCallEvent struct {
	CallID         string
	ConversationID uint
	CallerID       uint
	CallerName     string
	ReceiverID     uint
	ReceiverEmail  string
	CallType       string
	ExpiresAt      time.Time
}

type IncomingCallNotifier interface {
	NotifyIncomingCall(ctx context.Context, event IncomingCallEvent) error
}

type Client struct {
	conn    *grpc.ClientConn
	client  notificationpb.NotificationServiceClient
	channel string
	timeout time.Duration
}

func NewClient(cfg config.NotificationConfig) (*Client, error) {
	addr := strings.TrimSpace(cfg.ServiceAddr)
	if addr == "" {
		return nil, nil
	}
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}
	channel := strings.TrimSpace(cfg.Channel)
	if channel == "" {
		channel = "alert"
	}
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = 1500 * time.Millisecond
	}
	return &Client{
		conn:    conn,
		client:  notificationpb.NewNotificationServiceClient(conn),
		channel: channel,
		timeout: timeout,
	}, nil
}

func (c *Client) Close() error {
	if c == nil || c.conn == nil {
		return nil
	}
	return c.conn.Close()
}

func (c *Client) NotifyIncomingCall(ctx context.Context, event IncomingCallEvent) error {
	if c == nil || c.client == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	callLabel := "thoại"
	if event.CallType == "video" {
		callLabel = "video"
	}
	callerName := strings.TrimSpace(event.CallerName)
	if callerName == "" {
		callerName = "Ai đó"
	}

	recipient := strconv.FormatUint(uint64(event.ReceiverID), 10)
	if c.channel == "email" && strings.TrimSpace(event.ReceiverEmail) != "" {
		recipient = strings.TrimSpace(event.ReceiverEmail)
	}

	_, err := c.client.Send(ctx, &notificationpb.SendNotificationRequest{
		Channel:   c.channel,
		Type:      "incoming_call",
		Recipient: recipient,
		Subject:   fmt.Sprintf("Cuộc gọi %s đến", callLabel),
		Message:   fmt.Sprintf("%s đang gọi %s cho bạn", callerName, callLabel),
		Data: map[string]string{
			"call_id":         event.CallID,
			"conversation_id": strconv.FormatUint(uint64(event.ConversationID), 10),
			"caller_id":       strconv.FormatUint(uint64(event.CallerID), 10),
			"caller_name":     callerName,
			"receiver_id":     strconv.FormatUint(uint64(event.ReceiverID), 10),
			"call_type":       event.CallType,
			"expires_at":      event.ExpiresAt.Format(time.RFC3339),
		},
		Metadata: map[string]string{
			"source": "messenger-service",
			"event":  "call:incoming",
		},
	})
	return err
}
