package testcase

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/tumlumtala/users-service/internal/application/dto"
	"github.com/tumlumtala/users-service/internal/application/usecase"
	"github.com/tumlumtala/users-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
)

func TestCreateUserHashesPassword(t *testing.T) {
	store := &userStoreStub{}
	result, err := usecase.NewCreateUserUseCase(store, newQueryStub()).Execute(
		context.Background(),
		dto.CreateUserInput{Email: " TEST@example.com ", Password: "password123", Fullname: "Test User"},
	)
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
	_, err := usecase.NewCreateUserUseCase(store, newQueryStub()).Execute(
		context.Background(),
		dto.CreateUserInput{Email: "test@example.com", Password: "password123", Fullname: "Test", Role: "owner"},
	)
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestCreateUserRejectsInvalidPassword(t *testing.T) {
	store := &userStoreStub{}
	_, err := usecase.NewCreateUserUseCase(store, newQueryStub()).Execute(
		context.Background(),
		dto.CreateUserInput{Email: "test@example.com", Password: "short", Fullname: "Test"},
	)
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestCreateUserRejectsDuplicateEmail(t *testing.T) {
	existing := newTestUser()
	store := &userStoreStub{}
	_, err := usecase.NewCreateUserUseCase(store, newQueryStub(existing)).Execute(
		context.Background(),
		dto.CreateUserInput{Email: existing.Email, Password: "password123", Fullname: "Copy"},
	)
	if !errors.Is(err, domainerrors.ErrEmailExists) {
		t.Fatalf("expected ErrEmailExists, got %v", err)
	}
}
