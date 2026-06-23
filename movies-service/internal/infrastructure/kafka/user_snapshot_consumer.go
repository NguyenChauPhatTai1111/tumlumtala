package kafka

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"gorm.io/gorm"

	"github.com/tumlumtala/contracts/events"
	"github.com/tumlumtala/kafka-service/consumer"
	"github.com/tumlumtala/kafka-service/envelope"
	"github.com/tumlumtala/kafka-service/producer"
	"github.com/tumlumtala/kafka-service/topics"
)

const groupID = "movies-service"

// UserSnapshotConsumer keeps the local user_snapshots table in sync by consuming
// user lifecycle events published by users-service. Failures are retried with
// exponential backoff then routed to a DLQ topic.
type UserSnapshotConsumer struct {
	store   SnapshotStore
	brokers []string
	log     *slog.Logger
}

func NewUserSnapshotConsumer(db *gorm.DB, brokers []string, log *slog.Logger) *UserSnapshotConsumer {
	return &UserSnapshotConsumer{
		store:   newGormSnapshotStore(db),
		brokers: brokers,
		log:     log,
	}
}

// newWithStore is used in tests to inject a stub SnapshotStore.
func newWithStore(store SnapshotStore, brokers []string, log *slog.Logger) *UserSnapshotConsumer {
	return &UserSnapshotConsumer{store: store, brokers: brokers, log: log}
}

// Run starts one consumer per user event topic and blocks until ctx is cancelled.
func (c *UserSnapshotConsumer) Run(ctx context.Context) {
	dlq := producer.New(producer.Config{
		Brokers:     c.brokers,
		ServiceName: "movies-service",
	})
	defer dlq.Close()

	baseCfg := consumer.Config{
		Brokers:    c.brokers,
		GroupID:    groupID,
		MaxRetries: 3,
		Workers:    2,
	}

	createdCfg := baseCfg
	createdCfg.Topic = topics.UserCreated
	updatedCfg := baseCfg
	updatedCfg.Topic = topics.UserUpdated
	upsertedCfg := baseCfg
	upsertedCfg.Topic = topics.UserUpserted
	deletedCfg := baseCfg
	deletedCfg.Topic = topics.UserDeleted

	created := consumer.New(createdCfg, dlq, c.handleUpsert, c.log)
	updated := consumer.New(updatedCfg, dlq, c.handleUpsert, c.log)
	upserted := consumer.New(upsertedCfg, dlq, c.handleUpsert, c.log)
	deleted := consumer.New(deletedCfg, dlq, c.handleDelete, c.log)

	go created.Run(ctx)
	go updated.Run(ctx)
	go upserted.Run(ctx)
	go deleted.Run(ctx)

	<-ctx.Done()
}

func (c *UserSnapshotConsumer) handleUpsert(ctx context.Context, env envelope.Envelope) error {
	var id uint64
	var userUUID, email, fullname, avatar, role string

	if ev, err := consumer.Unmarshal[events.UserCreatedEvent](env); err == nil {
		id, userUUID, email, fullname, avatar, role = ev.ID, ev.UUID, ev.Email, ev.Fullname, ev.Avatar, ev.Role
	} else if ev, err := consumer.Unmarshal[events.UserUpdatedEvent](env); err == nil {
		id, userUUID, email, fullname, avatar, role = ev.ID, ev.UUID, ev.Email, ev.Fullname, ev.Avatar, ev.Role
	} else if ev, err := consumer.Unmarshal[events.UserUpsertedEvent](env); err == nil {
		id, userUUID, email, fullname, avatar, role = ev.ID, ev.UUID, ev.Email, ev.Fullname, ev.Avatar, ev.Role
	} else {
		return fmt.Errorf("handleUpsert: cannot unmarshal envelope topic=%s", env.Topic)
	}

	return c.store.Upsert(ctx, id, userUUID, email, fullname, avatar, role, time.Now().UTC())
}

func (c *UserSnapshotConsumer) handleDelete(ctx context.Context, env envelope.Envelope) error {
	ev, err := consumer.Unmarshal[events.UserDeletedEvent](env)
	if err != nil {
		return err
	}
	return c.store.Delete(ctx, ev.ID)
}
