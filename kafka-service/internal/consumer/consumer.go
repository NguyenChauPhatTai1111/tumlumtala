package consumer

import (
	"context"
	"encoding/json"
	"log"

	"github.com/segmentio/kafka-go"
)

type Handler func(ctx context.Context, key string, payload []byte) error

type Consumer struct {
	reader  *kafka.Reader
	handler Handler
}

func New(brokers []string, topic, groupID string, handler Handler) *Consumer {
	return &Consumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers:  brokers,
			Topic:    topic,
			GroupID:  groupID,
			MinBytes: 1,
			MaxBytes: 1e6,
		}),
		handler: handler,
	}
}

func (c *Consumer) Run(ctx context.Context) {
	for {
		msg, err := c.reader.ReadMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			log.Printf("[consumer] read error topic=%s: %v", c.reader.Config().Topic, err)
			continue
		}
		if err := c.handler(ctx, string(msg.Key), msg.Value); err != nil {
			log.Printf("[consumer] handler error topic=%s key=%s: %v", msg.Topic, msg.Key, err)
		}
	}
}

func (c *Consumer) Close() error {
	return c.reader.Close()
}

func Unmarshal[T any](payload []byte) (T, error) {
	var v T
	return v, json.Unmarshal(payload, &v)
}
