package kafka

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/tumlumtala/contracts/events"
	"github.com/tumlumtala/kafka-service/envelope"
)

// --- stub store ---

type snapshotStoreStub struct {
	upserted []upsertCall
	deleted  []uint64
	errOn    string // "upsert" | "delete"
}

type upsertCall struct {
	id       uint64
	uuid     string
	email    string
	fullname string
	avatar   string
	role     string
}

func (s *snapshotStoreStub) Upsert(_ context.Context, id uint64, userUUID, email, fullname, avatar, role string, _ time.Time) error {
	if s.errOn == "upsert" {
		return errors.New("db error")
	}
	s.upserted = append(s.upserted, upsertCall{id, userUUID, email, fullname, avatar, role})
	return nil
}

func (s *snapshotStoreStub) Delete(_ context.Context, id uint64) error {
	if s.errOn == "delete" {
		return errors.New("db error")
	}
	s.deleted = append(s.deleted, id)
	return nil
}

// --- helpers ---

func makeEnvelope(t *testing.T, topic string, payload any) envelope.Envelope {
	t.Helper()
	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	return envelope.Envelope{
		EventID:     uuid.NewString(),
		Topic:       topic,
		Attempt:     1,
		PublishedAt: time.Now().UTC(),
		Payload:     raw,
	}
}

func newConsumer(store SnapshotStore) *UserSnapshotConsumer {
	return newWithStore(store, nil, nil)
}

// --- tests ---

func TestHandleUpsert_UserCreatedEvent(t *testing.T) {
	store := &snapshotStoreStub{}
	c := newConsumer(store)

	ev := events.UserCreatedEvent{
		ID:        42,
		UUID:      uuid.NewString(),
		Email:     "alice@example.com",
		Fullname:  "Alice",
		Avatar:    "https://cdn.example.com/alice.png",
		Role:      "member",
		CreatedAt: time.Now().UTC(),
	}
	env := makeEnvelope(t, "user.created", ev)

	if err := c.handleUpsert(context.Background(), env); err != nil {
		t.Fatalf("handleUpsert: %v", err)
	}
	if len(store.upserted) != 1 {
		t.Fatalf("expected 1 upsert, got %d", len(store.upserted))
	}
	got := store.upserted[0]
	if got.id != ev.ID {
		t.Errorf("id: want %d, got %d", ev.ID, got.id)
	}
	if got.email != ev.Email {
		t.Errorf("email: want %q, got %q", ev.Email, got.email)
	}
	if got.avatar != ev.Avatar {
		t.Errorf("avatar: want %q, got %q", ev.Avatar, got.avatar)
	}
	if got.role != ev.Role {
		t.Errorf("role: want %q, got %q", ev.Role, got.role)
	}
}

func TestHandleUpsert_UserUpdatedEvent(t *testing.T) {
	store := &snapshotStoreStub{}
	c := newConsumer(store)

	ev := events.UserUpdatedEvent{
		ID:       7,
		UUID:     uuid.NewString(),
		Email:    "bob@example.com",
		Fullname: "Bob Updated",
		Avatar:   "https://cdn.example.com/bob.png",
		Role:     "manager",
	}
	env := makeEnvelope(t, "user.updated", ev)

	if err := c.handleUpsert(context.Background(), env); err != nil {
		t.Fatalf("handleUpsert: %v", err)
	}
	if len(store.upserted) != 1 {
		t.Fatalf("expected 1 upsert, got %d", len(store.upserted))
	}
	got := store.upserted[0]
	if got.fullname != "Bob Updated" {
		t.Errorf("fullname: want %q, got %q", "Bob Updated", got.fullname)
	}
}

func TestHandleUpsert_UserUpsertedEvent(t *testing.T) {
	store := &snapshotStoreStub{}
	c := newConsumer(store)

	ev := events.UserUpsertedEvent{
		ID:       55,
		UUID:     uuid.NewString(),
		Email:    "replay@example.com",
		Fullname: "Replay User",
		Avatar:   "https://cdn.example.com/replay.png",
		Role:     "member",
	}
	env := makeEnvelope(t, "user.upserted", ev)

	if err := c.handleUpsert(context.Background(), env); err != nil {
		t.Fatalf("handleUpsert: %v", err)
	}
	if len(store.upserted) != 1 {
		t.Fatalf("expected 1 upsert, got %d", len(store.upserted))
	}
	got := store.upserted[0]
	if got.id != ev.ID {
		t.Errorf("id: want %d, got %d", ev.ID, got.id)
	}
	if got.email != ev.Email {
		t.Errorf("email: want %q, got %q", ev.Email, got.email)
	}
}

func TestHandleUpsert_InvalidPayload(t *testing.T) {
	store := &snapshotStoreStub{}
	c := newConsumer(store)

	env := envelope.Envelope{
		EventID: uuid.NewString(),
		Topic:   "user.created",
		Payload: []byte(`not-valid-json`),
	}

	if err := c.handleUpsert(context.Background(), env); err == nil {
		t.Fatal("expected error for invalid payload, got nil")
	}
	if len(store.upserted) != 0 {
		t.Fatal("should not upsert on invalid payload")
	}
}

func TestHandleUpsert_StoreError_IsReturned(t *testing.T) {
	store := &snapshotStoreStub{errOn: "upsert"}
	c := newConsumer(store)

	ev := events.UserCreatedEvent{ID: 1, UUID: uuid.NewString(), Email: "x@x.com", Role: "member"}
	env := makeEnvelope(t, "user.created", ev)

	if err := c.handleUpsert(context.Background(), env); err == nil {
		t.Fatal("expected store error to be propagated")
	}
}

func TestHandleDelete_RemovesByID(t *testing.T) {
	store := &snapshotStoreStub{}
	c := newConsumer(store)

	ev := events.UserDeletedEvent{ID: 99, UUID: uuid.NewString()}
	env := makeEnvelope(t, "user.deleted", ev)

	if err := c.handleDelete(context.Background(), env); err != nil {
		t.Fatalf("handleDelete: %v", err)
	}
	if len(store.deleted) != 1 || store.deleted[0] != 99 {
		t.Errorf("expected id 99 deleted, got %v", store.deleted)
	}
}

func TestHandleDelete_InvalidPayload(t *testing.T) {
	store := &snapshotStoreStub{}
	c := newConsumer(store)

	env := envelope.Envelope{
		EventID: uuid.NewString(),
		Topic:   "user.deleted",
		Payload: []byte(`{bad`),
	}

	if err := c.handleDelete(context.Background(), env); err == nil {
		t.Fatal("expected error for invalid payload")
	}
}

func TestHandleDelete_StoreError_IsReturned(t *testing.T) {
	store := &snapshotStoreStub{errOn: "delete"}
	c := newConsumer(store)

	ev := events.UserDeletedEvent{ID: 5, UUID: uuid.NewString()}
	env := makeEnvelope(t, "user.deleted", ev)

	if err := c.handleDelete(context.Background(), env); err == nil {
		t.Fatal("expected store error to be propagated")
	}
}
