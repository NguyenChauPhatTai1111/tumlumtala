package testcase

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/tumlumtala/users-service/internal/application/usecase"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
)

func TestDeleteUserSucceeds(t *testing.T) {
	store := &userStoreStub{}
	uc := usecase.NewDeleteUserUseCase(store)

	err := uc.Execute(context.Background(), uuid.NewString())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestDeleteUserRejectsInvalidUUID(t *testing.T) {
	store := &userStoreStub{}
	uc := usecase.NewDeleteUserUseCase(store)

	err := uc.Execute(context.Background(), "not-a-uuid")
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestDeleteUserRejectsEmptyUUID(t *testing.T) {
	store := &userStoreStub{}
	uc := usecase.NewDeleteUserUseCase(store)

	err := uc.Execute(context.Background(), "")
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}
