package domain

import (
	"encoding/json"
	"time"
)

type Status string

const (
	StatusQueued     Status = "queued"
	StatusProcessing Status = "processing"
	StatusSent       Status = "sent"
	StatusRetrying   Status = "retrying"
	StatusDead       Status = "dead"
)

func (s Status) String() string {
	return string(s)
}

type Notification struct {
	ID        string            `json:"id"`
	Channel   Channel           `json:"channel"`
	Type      string            `json:"type,omitempty"`
	Recipient string            `json:"recipient"`
	Subject   string            `json:"subject,omitempty"`
	Message   string            `json:"message,omitempty"`
	Template  string            `json:"template,omitempty"`
	Data      map[string]string `json:"data,omitempty"`
	Metadata  map[string]string `json:"metadata,omitempty"`
	CreatedAt time.Time         `json:"created_at"`
}

type Envelope struct {
	Notification Notification      `json:"notification"`
	Attempt      int               `json:"attempt"`
	TraceID      string            `json:"trace_id,omitempty"`
	RequestID    string            `json:"request_id,omitempty"`
	PublishedAt  time.Time         `json:"published_at"`
	RawPayload   json.RawMessage   `json:"raw_payload,omitempty"`
	Headers      map[string]string `json:"headers,omitempty"`
}

type DeadLetterMessage struct {
	ID           string            `json:"id"`
	Notification Notification      `json:"notification"`
	RawPayload   json.RawMessage   `json:"raw_payload,omitempty"`
	Attempt      int               `json:"attempt"`
	MaxRetries   int               `json:"max_retries"`
	Reason       string            `json:"reason"`
	LastError    string            `json:"last_error"`
	FailedAt     time.Time         `json:"failed_at"`
	TraceID      string            `json:"trace_id,omitempty"`
	RequestID    string            `json:"request_id,omitempty"`
	Metadata     map[string]string `json:"metadata,omitempty"`
}
