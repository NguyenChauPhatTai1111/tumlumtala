package grpc

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	userpb "github.com/tumlumtala/contracts/generated/user"
	grpcCodes "google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/tumlumtala/users-service/internal/application/usecase"
	"github.com/tumlumtala/users-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
	kafkainfra "github.com/tumlumtala/users-service/internal/infrastructure/kafka"
)

// --- test doubles ---

type controllerStore struct {
	mu    sync.Mutex
	users map[string]*entity.User // keyed by uuid and email
}

func newControllerStore(users ...*entity.User) *controllerStore {
	s := &controllerStore{users: make(map[string]*entity.User)}
	for _, u := range users {
		s.users[u.UUID] = u
		s.users[u.Email] = u
	}
	return s
}

func (s *controllerStore) Create(_ context.Context, u *entity.User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.users[u.Email]; ok {
		return domainerrors.ErrEmailExists
	}
	s.users[u.UUID] = u
	s.users[u.Email] = u
	return nil
}

func (s *controllerStore) Update(_ context.Context, u *entity.User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users[u.UUID] = u
	s.users[u.Email] = u
	return nil
}

func (s *controllerStore) Delete(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if u, ok := s.users[id]; ok {
		delete(s.users, u.Email)
		delete(s.users, id)
	}
	return nil
}

func (s *controllerStore) GetByUUID(_ context.Context, id string) (*entity.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.users[id]
	if !ok {
		return nil, domainerrors.ErrNotFound
	}
	return u, nil
}

func (s *controllerStore) GetByEmail(_ context.Context, email string) (*entity.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.users[email]
	if !ok {
		return nil, domainerrors.ErrNotFound
	}
	return u, nil
}

func (s *controllerStore) List(_ context.Context, limit, offset int32, search string) ([]entity.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
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

func (s *controllerStore) Count(_ context.Context, _ string) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	seen := make(map[uint64]bool)
	for _, u := range s.users {
		seen[u.ID] = true
	}
	return int64(len(seen)), nil
}

func newController(users ...*entity.User) *UserController {
	store := newControllerStore(users...)
	noop := kafkainfra.NoopPublisher{}
	return NewUserController(
		usecase.NewCreateUserUseCase(store, store, noop),
		usecase.NewGetUserUseCase(store),
		usecase.NewListUsersUseCase(store),
		usecase.NewUpdateUserUseCase(store, store, noop),
		usecase.NewDeleteUserUseCase(store, store, noop),
	)
}

func seedUser() *entity.User {
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

// --- CreateUser ---

func TestControllerCreateUser(t *testing.T) {
	c := newController()
	resp, err := c.CreateUser(context.Background(), &userpb.CreateUserRequest{
		Email:    "bob@example.com",
		Password: "password123",
		Fullname: "Bob",
	})
	if err != nil {
		t.Fatal(err)
	}
	if resp.Email != "bob@example.com" {
		t.Fatalf("email = %q", resp.Email)
	}
	if resp.Uuid == "" {
		t.Fatal("uuid is empty")
	}
}

func TestControllerCreateUserDuplicateEmail(t *testing.T) {
	existing := seedUser()
	c := newController(existing)
	_, err := c.CreateUser(context.Background(), &userpb.CreateUserRequest{
		Email:    existing.Email,
		Password: "password123",
		Fullname: "Copy",
	})
	if err == nil {
		t.Fatal("expected error for duplicate email")
	}
	if code := status.Code(err); code != grpcCodes.AlreadyExists {
		t.Fatalf("grpc code = %v, want AlreadyExists", code)
	}
}

func TestControllerCreateUserInvalidInput(t *testing.T) {
	c := newController()
	_, err := c.CreateUser(context.Background(), &userpb.CreateUserRequest{
		Email:    "bad",
		Password: "short",
		Fullname: "X",
	})
	if err == nil {
		t.Fatal("expected error")
	}
	if code := status.Code(err); code != grpcCodes.InvalidArgument {
		t.Fatalf("grpc code = %v, want InvalidArgument", code)
	}
}

// --- GetUser ---

func TestControllerGetUser(t *testing.T) {
	user := seedUser()
	c := newController(user)
	resp, err := c.GetUser(context.Background(), &userpb.GetUserRequest{Uuid: user.UUID})
	if err != nil {
		t.Fatal(err)
	}
	if resp.Uuid != user.UUID {
		t.Fatalf("uuid = %q, want %q", resp.Uuid, user.UUID)
	}
}

func TestControllerGetUserNotFound(t *testing.T) {
	c := newController()
	_, err := c.GetUser(context.Background(), &userpb.GetUserRequest{Uuid: uuid.NewString()})
	if err == nil {
		t.Fatal("expected error")
	}
	if code := status.Code(err); code != grpcCodes.NotFound {
		t.Fatalf("grpc code = %v, want NotFound", code)
	}
}

func TestControllerGetUserInvalidUUID(t *testing.T) {
	c := newController()
	_, err := c.GetUser(context.Background(), &userpb.GetUserRequest{Uuid: "bad"})
	if err == nil {
		t.Fatal("expected error")
	}
	if code := status.Code(err); code != grpcCodes.InvalidArgument {
		t.Fatalf("grpc code = %v, want InvalidArgument", code)
	}
}

// --- ListUsers ---

func TestControllerListUsers(t *testing.T) {
	c := newController(seedUser())
	resp, err := c.ListUsers(context.Background(), &userpb.ListUsersRequest{Limit: 10, Offset: 0})
	if err != nil {
		t.Fatal(err)
	}
	if resp.Total != 1 {
		t.Fatalf("total = %d, want 1", resp.Total)
	}
	if len(resp.Users) != 1 {
		t.Fatalf("len(users) = %d, want 1", len(resp.Users))
	}
}

func TestControllerListUsersEmpty(t *testing.T) {
	c := newController()
	resp, err := c.ListUsers(context.Background(), &userpb.ListUsersRequest{Limit: 10, Offset: 0})
	if err != nil {
		t.Fatal(err)
	}
	if resp.Total != 0 {
		t.Fatalf("total = %d, want 0", resp.Total)
	}
}

// --- UpdateUser ---

func TestControllerUpdateUser(t *testing.T) {
	user := seedUser()
	c := newController(user)
	resp, err := c.UpdateUser(context.Background(), &userpb.UpdateUserRequest{
		Uuid:     user.UUID,
		Email:    "alice-new@example.com",
		Fullname: "Alice New",
		Role:     "manager",
	})
	if err != nil {
		t.Fatal(err)
	}
	if resp.Email != "alice-new@example.com" {
		t.Fatalf("email = %q", resp.Email)
	}
	if resp.Role != "manager" {
		t.Fatalf("role = %q", resp.Role)
	}
}

func TestControllerUpdateUserNotFound(t *testing.T) {
	c := newController()
	_, err := c.UpdateUser(context.Background(), &userpb.UpdateUserRequest{
		Uuid:     uuid.NewString(),
		Email:    "x@example.com",
		Fullname: "X",
	})
	if err == nil {
		t.Fatal("expected error")
	}
	if code := status.Code(err); code != grpcCodes.NotFound {
		t.Fatalf("grpc code = %v, want NotFound", code)
	}
}

// --- DeleteUser ---

func TestControllerDeleteUser(t *testing.T) {
	user := seedUser()
	c := newController(user)
	resp, err := c.DeleteUser(context.Background(), &userpb.DeleteUserRequest{Uuid: user.UUID})
	if err != nil {
		t.Fatal(err)
	}
	if !resp.Deleted {
		t.Fatal("expected deleted = true")
	}
}

func TestControllerDeleteUserInvalidUUID(t *testing.T) {
	c := newController()
	_, err := c.DeleteUser(context.Background(), &userpb.DeleteUserRequest{Uuid: "not-valid"})
	if err == nil {
		t.Fatal("expected error")
	}
	if code := status.Code(err); code != grpcCodes.InvalidArgument {
		t.Fatalf("grpc code = %v, want InvalidArgument", code)
	}
}

// --- mapError ---

func TestMapErrorDomainErrors(t *testing.T) {
	cases := []struct {
		err  error
		code grpcCodes.Code
	}{
		{domainerrors.ErrInvalidInput, grpcCodes.InvalidArgument},
		{domainerrors.ErrNotFound, grpcCodes.NotFound},
		{domainerrors.ErrEmailExists, grpcCodes.AlreadyExists},
		{errors.New("unexpected"), grpcCodes.Internal},
	}
	for _, tc := range cases {
		mapped := mapError(tc.err)
		if code := status.Code(mapped); code != tc.code {
			t.Errorf("mapError(%v) code = %v, want %v", tc.err, code, tc.code)
		}
	}
}
