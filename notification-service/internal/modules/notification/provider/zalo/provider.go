package zalo

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
	endpoint string
	token    string
	client   *http.Client
}

func New(endpoint, token string) *Provider {
	return &Provider{
		endpoint: endpoint,
		token:    token,
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

func (p *Provider) Send(ctx context.Context, notification domain.Notification) error {
	if p.endpoint == "" {
		return fmt.Errorf("zalo provider endpoint is not configured")
	}

	body, err := json.Marshal(notification)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if p.token != "" {
		req.Header.Set("Authorization", "Bearer "+p.token)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("zalo provider returned status %d", resp.StatusCode)
	}
	return nil
}
