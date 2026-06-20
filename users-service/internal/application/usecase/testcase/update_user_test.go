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

func TestUpdateUserChangesFields(t *testing.T) {
	user := newTestUser()
	store := &userStoreStub{}
	uc := usecase.NewUpdateUserUseCase(store, newQueryStub(user))

	result, err := uc.Execute(context.Background(), dto.UpdateUserInput{
		UUID:     user.UUID,
		Email:    "  BOB@example.com  ",
		Fullname: "Bob",
		Role:     "manager",
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.Email != "bob@example.com" {
		t.Fatalf("email = %q, want %q", result.Email, "bob@example.com")
	}
	if result.Fullname != "Bob" {
		t.Fatalf("fullname = %q, want %q", result.Fullname, "Bob")
	}
	if result.Role != string(entity.RoleManager) {
		t.Fatalf("role = %q, want %q", result.Role, entity.RoleManager)
	}
}

func TestUpdateUserKeepsRoleWhenEmpty(t *testing.T) {
	user := newTestUser()
	user.Role = entity.RoleAdministrator
	store := &userStoreStub{}
	uc := usecase.NewUpdateUserUseCase(store, newQueryStub(user))

	result, err := uc.Execute(context.Background(), dto.UpdateUserInput{
		UUID:     user.UUID,
		Email:    "alice@example.com",
		Fullname: "Alice",
		Role:     "",
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.Role != string(entity.RoleAdministrator) {
		t.Fatalf("role = %q, want %q", result.Role, entity.RoleAdministrator)
	}
}

func TestUpdateUserNotFound(t *testing.T) {
	store := &userStoreStub{}
	uc := usecase.NewUpdateUserUseCase(store, newQueryStub())

	_, err := uc.Execute(context.Background(), dto.UpdateUserInput{
		UUID:     uuid.NewString(),
		Email:    "alice@example.com",
		Fullname: "Alice",
	})
	if !errors.Is(err, domainerrors.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestUpdateUserRejectsInvalidUUID(t *testing.T) {
	store := &userStoreStub{}
	uc := usecase.NewUpdateUserUseCase(store, newQueryStub())

	_, err := uc.Execute(context.Background(), dto.UpdateUserInput{
		UUID:     "bad-uuid",
		Email:    "alice@example.com",
		Fullname: "Alice",
	})
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestUpdateUserRejectsInvalidRole(t *testing.T) {
	user := newTestUser()
	store := &userStoreStub{}
	uc := usecase.NewUpdateUserUseCase(store, newQueryStub(user))

	_, err := uc.Execute(context.Background(), dto.UpdateUserInput{
		UUID:     user.UUID,
		Email:    "alice@example.com",
		Fullname: "Alice",
		Role:     "superadmin",
	})
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestUpdateUserRejectsEmptyEmail(t *testing.T) {
	user := newTestUser()
	store := &userStoreStub{}
	uc := usecase.NewUpdateUserUseCase(store, newQueryStub(user))

	_, err := uc.Execute(context.Background(), dto.UpdateUserInput{
		UUID:     user.UUID,
		Email:    "",
		Fullname: "Alice",
	})
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}
