package testcase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/tumlumtala/users-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
)

// noopPublisher satisfies repository.EventPublisher without side effects.
type noopPublisher struct{}

func (noopPublisher) PublishUserCreated(_ context.Context, _ uint64, _, _, _, _, _ string) error {
	return nil
}
func (noopPublisher) PublishUserUpdated(_ context.Context, _ uint64, _, _, _, _, _ string) error {
	return nil
}
func (noopPublisher) PublishUserDeleted(_ context.Context, _ uint64, _ string) error { return nil }

// --- userStoreStub: implements repository.UserRepository ---

type userStoreStub struct{ created *entity.User }

func (s *userStoreStub) Create(_ context.Context, user *entity.User) error {
	s.created = user
	return nil
}
func (s *userStoreStub) Update(_ context.Context, _ *entity.User) error { return nil }
func (s *userStoreStub) Delete(_ context.Context, _ string) error       { return nil }

// --- queryStub: implements queryservice.UserQueryService ---

type queryStub struct {
	users map[string]*entity.User // keyed by uuid and email
}

func newQueryStub(users ...*entity.User) *queryStub {
	m := make(map[string]*entity.User, len(users)*2)
	for _, u := range users {
		m[u.UUID] = u
		m[u.Email] = u
	}
	return &queryStub{users: m}
}

func (s *queryStub) GetByUUID(_ context.Context, id string) (*entity.User, error) {
	u, ok := s.users[id]
	if !ok {
		return nil, domainerrors.ErrNotFound
	}
	return u, nil
}

func (s *queryStub) GetByEmail(_ context.Context, email string) (*entity.User, error) {
	u, ok := s.users[email]
	if !ok {
		return nil, domainerrors.ErrNotFound
	}
	return u, nil
}

func (s *queryStub) List(_ context.Context, limit, offset int32) ([]entity.User, error) {
	seen := make(map[uint64]bool)
	all := make([]entity.User, 0)
	for _, u := range s.users {
		if !seen[u.ID] {
			seen[u.ID] = true
			all = append(all, *u)
		}
	}
	start := int(offset)
	if start >= len(all) {
		return []entity.User{}, nil
	}
	end := start + int(limit)
	if end > len(all) {
		end = len(all)
	}
	return all[start:end], nil
}

func (s *queryStub) Count(_ context.Context) (int64, error) {
	seen := make(map[uint64]bool)
	for _, u := range s.users {
		seen[u.ID] = true
	}
	return int64(len(seen)), nil
}

// --- factories ---

func newTestUser() *entity.User {
	return &entity.User{
		ID:        1,
		UUID:      uuid.NewString(),
		Email:     "alice@example.com",
		Password:  "hashed",
		Fullname:  "Alice",
		Role:      entity.RoleMember,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
}

func makeUsers(n int) []*entity.User {
	users := make([]*entity.User, n)
	for i := 0; i < n; i++ {
		users[i] = &entity.User{
			ID:        uint64(i + 1),
			UUID:      uuid.NewString(),
			Email:     "user" + string(rune('a'+i)) + "@example.com",
			Fullname:  "User",
			Role:      entity.RoleMember,
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}
	}
	return users
}
