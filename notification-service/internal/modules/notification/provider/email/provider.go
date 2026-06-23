package email

import (
	"bytes"
	"context"
	"crypto/tls"
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"mime"
	"net"
	"net/http"
	"net/mail"
	"net/smtp"
	"os"
	"strings"
	"time"

	"tumlumtala/notification-service/internal/config"
	"tumlumtala/notification-service/internal/modules/notification/domain"
)

//go:embed templates/*.html
var templateFS embed.FS

type Provider struct {
	cfg        config.SMTPConfig
	httpClient *http.Client
}

func New(cfg config.SMTPConfig) *Provider {
	return &Provider{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (p *Provider) Send(ctx context.Context, notification domain.Notification) error {
	subject := notification.Subject
	if subject == "" {
		subject = "Tumlumtala notification"
	}

	body, err := p.renderBody(notification)
	if err != nil {
		return err
	}

	// Nếu có BREVO_API_KEY thì dùng Transactional Email API, không cần cấu hình SMTP credential.
	if p.cfg.APIKey != "" {
		return p.sendWithAPI(ctx, notification.Recipient, subject, body)
	}

	if p.cfg.Host == "" || p.cfg.Username == "" || p.cfg.Password == "" || p.cfg.From == "" {
		return fmt.Errorf("email provider is not configured")
	}

	// Fallback SMTP giữ nguyên behavior cũ để không phá cấu hình đang chạy.
	from := mail.Address{Name: p.cfg.FromName, Address: p.cfg.From}
	msg := buildMessage(from.String(), notification.Recipient, subject, body)
	addr := net.JoinHostPort(p.cfg.Host, fmt.Sprint(p.cfg.Port))
	auth := smtp.PlainAuth("", p.cfg.Username, p.cfg.Password, p.cfg.Host)

	done := make(chan error, 1)
	go func() {
		done <- p.send(addr, auth, p.cfg.From, []string{notification.Recipient}, msg)
	}()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case err := <-done:
		return err
	}
}

func (p *Provider) renderBody(notification domain.Notification) (string, error) {
	if notification.Template == "" {
		return notification.Message, nil
	}

	tpl, err := parseTemplate(notification.Template)
	if err != nil {
		return "", fmt.Errorf("parse mail template: %w", err)
	}

	var buf bytes.Buffer
	if err := tpl.Execute(&buf, notification.Data); err != nil {
		return "", fmt.Errorf("render mail template: %w", err)
	}
	return buf.String(), nil
}

func parseTemplate(name string) (*template.Template, error) {
	// Cho phép truyền path trực tiếp để các command cũ vẫn render được file ngoài.
	if _, err := os.Stat(name); err == nil {
		return template.ParseFiles(name)
	}

	// Với command event, template name như "welcome_user" sẽ map tới embedded template.
	templatePath := name
	if !strings.HasSuffix(templatePath, ".html") {
		templatePath += ".html"
	}
	return template.ParseFS(templateFS, "templates/"+templatePath)
}

func (p *Provider) sendWithAPI(ctx context.Context, recipient, subject, body string) error {
	if p.cfg.From == "" {
		return fmt.Errorf("email sender is not configured")
	}

	payload := brevoEmailRequest{
		Sender: brevoEmailAddress{
			Name:  p.cfg.FromName,
			Email: p.cfg.From,
		},
		To: []brevoEmailAddress{
			{Email: recipient},
		},
		Subject:     subject,
		HTMLContent: body,
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal brevo email request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.cfg.APIURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("create brevo email request: %w", err)
	}
	req.Header.Set("accept", "application/json")
	req.Header.Set("api-key", p.cfg.APIKey)
	req.Header.Set("content-type", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("send brevo email request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("brevo email request failed: status %d", resp.StatusCode)
	}
	return nil
}

func (p *Provider) send(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	conn, err := net.DialTimeout("tcp", addr, 10*time.Second)
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, p.cfg.Host)
	if err != nil {
		return err
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{ServerName: p.cfg.Host, MinVersion: tls.VersionTLS12}
		if err := client.StartTLS(tlsConfig); err != nil {
			return err
		}
	}
	if err := client.Auth(auth); err != nil {
		return err
	}
	if err := client.Mail(from); err != nil {
		return err
	}
	for _, recipient := range to {
		if err := client.Rcpt(recipient); err != nil {
			return err
		}
	}
	writer, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := writer.Write(msg); err != nil {
		_ = writer.Close()
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}
	return client.Quit()
}

func buildMessage(from, to, subject, body string) []byte {
	headers := map[string]string{
		"From":         from,
		"To":           to,
		"Subject":      mime.QEncoding.Encode("UTF-8", subject),
		"MIME-Version": "1.0",
		"Content-Type": "text/html; charset=UTF-8",
	}

	var builder strings.Builder
	for k, v := range headers {
		builder.WriteString(k)
		builder.WriteString(": ")
		builder.WriteString(v)
		builder.WriteString("\r\n")
	}
	builder.WriteString("\r\n")
	builder.WriteString(body)
	return []byte(builder.String())
}

type brevoEmailRequest struct {
	Sender      brevoEmailAddress   `json:"sender"`
	To          []brevoEmailAddress `json:"to"`
	Subject     string              `json:"subject"`
	HTMLContent string              `json:"htmlContent"`
}

type brevoEmailAddress struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email"`
}
