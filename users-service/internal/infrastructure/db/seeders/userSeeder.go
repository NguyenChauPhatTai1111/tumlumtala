package seeders

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/tumlumtala/users-service/internal/application/dto"
	"github.com/tumlumtala/users-service/internal/application/queryservice"
	"github.com/tumlumtala/users-service/internal/application/usecase"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
)

type UserSeeder struct {
	create  *usecase.CreateUserUseCase
	update  *usecase.UpdateUserUseCase
	queries queryservice.UserQueryService
}

func NewUserSeeder(create *usecase.CreateUserUseCase, update *usecase.UpdateUserUseCase, queries queryservice.UserQueryService) *UserSeeder {
	return &UserSeeder{create: create, update: update, queries: queries}
}

func (s *UserSeeder) Name() string { return "UserSeeder" }

func (s *UserSeeder) Run(ctx context.Context) error {
	users := []dto.CreateUserInput{
		{Email: "admin@tumlumtala.local", Password: "password", Fullname: "System Administrator", Role: "administrator"},
		{Email: "manager1@tumlumtala.local", Password: "password", Fullname: "Nguyen Minh Quan", Role: "manager"},
		{Email: "manager2@tumlumtala.local", Password: "password", Fullname: "Tran Thu Ha", Role: "manager"},
		{Email: "member1@tumlumtala.local", Password: "password", Fullname: "Le Hoang Nam", Role: "member"},
		{Email: "member2@tumlumtala.local", Password: "password", Fullname: "Pham Ngoc Anh", Role: "member"},
		{Email: "member3@tumlumtala.local", Password: "password", Fullname: "Do Thanh Tung", Role: "member"},
		{Email: "member4@tumlumtala.local", Password: "password", Fullname: "Vu Mai Linh", Role: "member"},
		{Email: "member5@tumlumtala.local", Password: "password", Fullname: "Bui Gia Huy", Role: "member"},
		{Email: "member6@tumlumtala.local", Password: "password", Fullname: "Hoang Bao Chau", Role: "member"},
		{Email: "member7@tumlumtala.local", Password: "password", Fullname: "Dang Quoc Viet", Role: "member"},
	}

	log.Printf("[%s] seeding %d users", s.Name(), len(users))
	for _, input := range users {
		if err := s.seedUser(ctx, input); err != nil {
			return fmt.Errorf("seed user %s: %w", input.Email, err)
		}
	}
	return nil
}

func (s *UserSeeder) seedUser(ctx context.Context, input dto.CreateUserInput) error {
	existing, err := s.queries.GetByEmail(ctx, input.Email)
	if err != nil && !errors.Is(err, domainerrors.ErrNotFound) {
		return err
	}
	if existing == nil {
		created, err := s.create.Execute(ctx, input)
		if err != nil {
			return err
		}
		log.Printf("  CREATE UserDTO{ID:%d UUID:%s Email:%q Fullname:%q Role:%q}", created.ID, created.UUID, created.Email, created.Fullname, created.Role)
		return nil
	}

	updated, err := s.update.Execute(ctx, dto.UpdateUserInput{
		UUID: existing.UUID, Email: input.Email, Fullname: input.Fullname, Role: input.Role,
	})
	if err != nil {
		return err
	}
	log.Printf("  UPDATE UserDTO{ID:%d UUID:%s Email:%q Fullname:%q Role:%q}", updated.ID, updated.UUID, updated.Email, updated.Fullname, updated.Role)
	return nil
}
