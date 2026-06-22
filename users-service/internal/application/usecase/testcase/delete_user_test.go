package testcase

import (
	"context"
	"errors"
	"testing"

	"github.com/tumlumtala/users-service/internal/application/usecase"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
)

func TestDeleteUserSucceeds(t *testing.T) {
	user := newTestUser()
	store := &userStoreStub{}
	uc := usecase.NewDeleteUserUseCase(store, newQueryStub(user), noopPublisher{})

	err := uc.Execute(context.Background(), user.UUID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestDeleteUserRejectsInvalidUUID(t *testing.T) {
	store := &userStoreStub{}
	uc := usecase.NewDeleteUserUseCase(store, newQueryStub(), noopPublisher{})

	err := uc.Execute(context.Background(), "not-a-uuid")
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestDeleteUserRejectsEmptyUUID(t *testing.T) {
	store := &userStoreStub{}
	uc := usecase.NewDeleteUserUseCase(store, newQueryStub(), noopPublisher{})

	err := uc.Execute(context.Background(), "")
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}
