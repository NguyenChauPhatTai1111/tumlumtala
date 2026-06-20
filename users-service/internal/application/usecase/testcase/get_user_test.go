package testcase

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/tumlumtala/users-service/internal/application/usecase"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
)

func TestGetUserReturnsUser(t *testing.T) {
	user := newTestUser()
	uc := usecase.NewGetUserUseCase(newQueryStub(user))

	result, err := uc.Execute(context.Background(), user.UUID)
	if err != nil {
		t.Fatal(err)
	}
	if result.UUID != user.UUID {
		t.Fatalf("uuid = %q, want %q", result.UUID, user.UUID)
	}
	if result.Email != user.Email {
		t.Fatalf("email = %q, want %q", result.Email, user.Email)
	}
}

func TestGetUserNotFound(t *testing.T) {
	uc := usecase.NewGetUserUseCase(newQueryStub())

	_, err := uc.Execute(context.Background(), uuid.NewString())
	if !errors.Is(err, domainerrors.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestGetUserRejectsInvalidUUID(t *testing.T) {
	uc := usecase.NewGetUserUseCase(newQueryStub())

	_, err := uc.Execute(context.Background(), "not-a-uuid")
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestGetUserRejectsEmptyUUID(t *testing.T) {
	uc := usecase.NewGetUserUseCase(newQueryStub())

	_, err := uc.Execute(context.Background(), "")
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}
