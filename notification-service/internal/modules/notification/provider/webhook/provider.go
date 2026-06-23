package webhook

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"tumlumtala/notification-service/internal/modules/notification/domain"
)

type Provider struct {
	client *http.Client
}

func New() *Provider {
	return &Provider{client: &http.Client{Timeout: 10 * time.Second}}
}

func (p *Provider) Send(ctx context.Context, notification domain.Notification) error {
	endpoint := notification.Recipient
	if endpoint == "" {
		return fmt.Errorf("webhook recipient endpoint is required")
	}

	body, err := json.Marshal(notification)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("webhook returned status %d", resp.StatusCode)
	}
	return nil
}
