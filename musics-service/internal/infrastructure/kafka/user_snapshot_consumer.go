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

const groupID = "musics-service"

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

func newWithStore(store SnapshotStore, brokers []string, log *slog.Logger) *UserSnapshotConsumer {
	return &UserSnapshotConsumer{store: store, brokers: brokers, log: log}
}

func (c *UserSnapshotConsumer) Run(ctx context.Context) {
	dlq := producer.New(producer.Config{
		Brokers:     c.brokers,
		ServiceName: "musics-service",
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
	var userUUID, email, fullname, avatar, role, status string

	if ev, err := consumer.Unmarshal[events.UserCreatedEvent](env); err == nil {
		id, userUUID, email, fullname, avatar, role, status = ev.ID, ev.UUID, ev.Email, ev.Fullname, ev.Avatar, ev.Role, ev.Status
	} else if ev, err := consumer.Unmarshal[events.UserUpdatedEvent](env); err == nil {
		id, userUUID, email, fullname, avatar, role, status = ev.ID, ev.UUID, ev.Email, ev.Fullname, ev.Avatar, ev.Role, ev.Status
	} else if ev, err := consumer.Unmarshal[events.UserUpsertedEvent](env); err == nil {
		id, userUUID, email, fullname, avatar, role, status = ev.ID, ev.UUID, ev.Email, ev.Fullname, ev.Avatar, ev.Role, ev.Status
	} else {
		return fmt.Errorf("handleUpsert: cannot unmarshal envelope topic=%s", env.Topic)
	}
	if status == "" {
		status = "active"
	}

	return c.store.Upsert(ctx, id, userUUID, email, fullname, avatar, role, status, time.Now().UTC())
}

func (c *UserSnapshotConsumer) handleDelete(ctx context.Context, env envelope.Envelope) error {
	ev, err := consumer.Unmarshal[events.UserDeletedEvent](env)
	if err != nil {
		return err
	}
	return c.store.Delete(ctx, ev.ID)
}
