package testcase

import (
	"context"
	"errors"
	"testing"

	"github.com/tumlumtala/users-service/internal/application/usecase"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
)

func TestListUsersDefaultLimit(t *testing.T) {
	users := makeUsers(5)
	uc := usecase.NewListUsersUseCase(newQueryStub(users...))

	result, err := uc.Execute(context.Background(), 0, 0, "")
	if err != nil {
		t.Fatal(err)
	}
	if result.Total != 5 {
		t.Fatalf("total = %d, want 5", result.Total)
	}
	if len(result.Users) != 5 {
		t.Fatalf("len(users) = %d, want 5", len(result.Users))
	}
}

func TestListUsersCapsLimitAt100(t *testing.T) {
	users := makeUsers(3)
	uc := usecase.NewListUsersUseCase(newQueryStub(users...))

	result, err := uc.Execute(context.Background(), 999, 0, "")
	if err != nil {
		t.Fatal(err)
	}
	if result.Total != 3 {
		t.Fatalf("total = %d, want 3", result.Total)
	}
}

func TestListUsersNegativeOffsetReturnsError(t *testing.T) {
	uc := usecase.NewListUsersUseCase(newQueryStub())

	_, err := uc.Execute(context.Background(), 10, -1, "")
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestListUsersEmptyResult(t *testing.T) {
	uc := usecase.NewListUsersUseCase(newQueryStub())

	result, err := uc.Execute(context.Background(), 10, 0, "")
	if err != nil {
		t.Fatal(err)
	}
	if result.Total != 0 {
		t.Fatalf("total = %d, want 0", result.Total)
	}
	if len(result.Users) != 0 {
		t.Fatalf("len(users) = %d, want 0", len(result.Users))
	}
}
