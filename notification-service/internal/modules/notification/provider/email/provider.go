package email

import (
	"bytes"
	"context"
	"crypto/tls"
	"fmt"
	"html/template"
	"mime"
	"net"
	"net/mail"
	"net/smtp"
	"strings"
	"time"

	"tumlumtala/notification-service/internal/config"
	"tumlumtala/notification-service/internal/modules/notification/domain"
)

type Provider struct {
	cfg config.SMTPConfig
}

func New(cfg config.SMTPConfig) *Provider {
	return &Provider{cfg: cfg}
}

func (p *Provider) Send(ctx context.Context, notification domain.Notification) error {
	if p.cfg.Host == "" || p.cfg.Username == "" || p.cfg.Password == "" || p.cfg.From == "" {
		return fmt.Errorf("smtp is not configured")
	}

	subject := notification.Subject
	if subject == "" {
		subject = "Tumlumtala notification"
	}

	body, err := p.renderBody(notification)
	if err != nil {
		return err
	}

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

	tpl, err := template.ParseFiles(notification.Template)
	if err != nil {
		return "", fmt.Errorf("parse mail template: %w", err)
	}

	var buf bytes.Buffer
	if err := tpl.Execute(&buf, notification.Data); err != nil {
		return "", fmt.Errorf("render mail template: %w", err)
	}
	return buf.String(), nil
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
