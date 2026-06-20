package usecase

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/tumlumtala/users-service/internal/application/dto"
	"github.com/tumlumtala/users-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
)

type userStoreStub struct{ created *entity.User }

func (s *userStoreStub) Create(_ context.Context, user *entity.User) error {
	s.created = user
	return nil
}
func (s *userStoreStub) Update(context.Context, *entity.User) error { return nil }
func (s *userStoreStub) Delete(context.Context, string) error       { return nil }
func (s *userStoreStub) GetByUUID(context.Context, string) (*entity.User, error) {
	return nil, domainerrors.ErrNotFound
}
func (s *userStoreStub) GetByEmail(context.Context, string) (*entity.User, error) {
	return nil, domainerrors.ErrNotFound
}
func (s *userStoreStub) List(context.Context, int32, int32) ([]entity.User, error) { return nil, nil }
func (s *userStoreStub) Count(context.Context) (int64, error)                      { return 0, nil }

func TestCreateUserHashesPassword(t *testing.T) {
	store := &userStoreStub{}
	result, err := NewCreateUserUseCase(store, store).Execute(context.Background(), dto.CreateUserInput{Email: " TEST@example.com ", Password: "password123", Fullname: "Test User"})
	if err != nil {
		t.Fatal(err)
	}
	if result.Email != "test@example.com" {
		t.Fatalf("email = %q", result.Email)
	}
	if store.created.Password == "" || store.created.Password == "password123" {
		t.Fatal("password was not hashed")
	}
	if store.created.Role != entity.RoleMember {
		t.Fatalf("default role = %q", store.created.Role)
	}
	if store.created.UUID == "" {
		t.Fatal("uuid was not generated")
	}
	if _, err := uuid.Parse(store.created.UUID); err != nil {
		t.Fatalf("invalid generated uuid: %v", err)
	}
}

func TestCreateUserRejectsInvalidRole(t *testing.T) {
	store := &userStoreStub{}
	_, err := NewCreateUserUseCase(store, store).Execute(context.Background(), dto.CreateUserInput{
		Email: "test@example.com", Password: "password123", Fullname: "Test", Role: "owner",
	})
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestCreateUserRejectsInvalidPassword(t *testing.T) {
	store := &userStoreStub{}
	_, err := NewCreateUserUseCase(store, store).Execute(context.Background(), dto.CreateUserInput{Email: "test@example.com", Password: "short", Fullname: "Test"})
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}
