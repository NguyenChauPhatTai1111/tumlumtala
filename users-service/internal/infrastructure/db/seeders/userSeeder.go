package seeders

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/tumlumtala/users-service/internal/application/dto"
	"github.com/tumlumtala/users-service/internal/application/queryservice"
	"github.com/tumlumtala/users-service/internal/application/usecase"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
)

// RootDir must be set by the caller (cmd/seed/main.go) before Run is called.
// Seeders use this to locate seed-assets regardless of working directory.
var RootDir string

type UserSeeder struct {
	create  *usecase.CreateUserUseCase
	update  *usecase.UpdateUserUseCase
	queries queryservice.UserQueryService
}

func NewUserSeeder(create *usecase.CreateUserUseCase, update *usecase.UpdateUserUseCase, queries queryservice.UserQueryService) *UserSeeder {
	return &UserSeeder{create: create, update: update, queries: queries}
}

func (s *UserSeeder) Name() string { return "UserSeeder" }

type userSeedDef struct {
	email      string
	fullname   string
	role       string
	avatarFile string
}

func (s *UserSeeder) Run(ctx context.Context) error {
	defs := []userSeedDef{
		{email: "admin@gmail.com", fullname: "Admin User", role: "administrator", avatarFile: "admin.png"},
		{email: "user@gmail.com", fullname: "John Doe", role: "member", avatarFile: "john_doe.png"},
		{email: "test@gmail.com", fullname: "Jane Smith", role: "member", avatarFile: "jane_smith.png"},
		{email: "designer@gmail.com", fullname: "Marry", role: "member", avatarFile: "marry.png"},
		{email: "john@gmail.com", fullname: "John", role: "member", avatarFile: "john.png"},
		{email: "peter@gmail.com", fullname: "Peter", role: "member", avatarFile: "peter.png"},
		{email: "nick@gmail.com", fullname: "Nick", role: "member", avatarFile: "nick.png"},
		{email: "henry@gmail.com", fullname: "Henry", role: "member", avatarFile: "henry.png"},
		{email: "vietnam@gmail.com", fullname: "Vietnamese", role: "member", avatarFile: "vietnamese.png"},
		{email: "saigon@gmail.com", fullname: "Saigonese", role: "member", avatarFile: "saigonese.png"},
	}

	avatarURLs := copyUserAvatars(defs)

	log.Printf("[%s] seeding %d users", s.Name(), len(defs))
	for _, def := range defs {
		if err := s.seedUser(ctx, def, avatarURLs[def.email]); err != nil {
			return fmt.Errorf("seed user %s: %w", def.email, err)
		}
	}
	return nil
}

func (s *UserSeeder) seedUser(ctx context.Context, def userSeedDef, avatar string) error {
	existing, err := s.queries.GetByEmail(ctx, def.email)
	if err != nil && !errors.Is(err, domainerrors.ErrNotFound) {
		return err
	}
	if existing == nil {
		created, err := s.create.Execute(ctx, dto.CreateUserInput{
			Email: def.email, Password: "123123", Fullname: def.fullname, Role: def.role,
		})
		if err != nil {
			return err
		}
		// Set avatar via update after create so avatar flows through Kafka event
		if avatar != "" {
			updated, err := s.update.Execute(ctx, dto.UpdateUserInput{
				UUID: created.UUID, Email: created.Email, Fullname: created.Fullname,
				Avatar: avatar, Role: created.Role,
			})
			if err != nil {
				return err
			}
			log.Printf("  CREATE+AVATAR id=%d email=%q avatar=%q", updated.ID, updated.Email, updated.Avatar)
			return nil
		}
		log.Printf("  CREATE id=%d email=%q", created.ID, created.Email)
		return nil
	}

	updated, err := s.update.Execute(ctx, dto.UpdateUserInput{
		UUID: existing.UUID, Email: def.email, Fullname: def.fullname,
		Avatar: avatar, Role: def.role,
	})
	if err != nil {
		return err
	}
	log.Printf("  UPDATE id=%d email=%q avatar=%q", updated.ID, updated.Email, updated.Avatar)
	return nil
}

func copyUserAvatars(defs []userSeedDef) map[string]string {
	result := make(map[string]string, len(defs))

	assetsDir := filepath.Join(RootDir, "seed-assets", "users", "avatars")
	uploadDir := os.Getenv("LOCAL_UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = filepath.Join(RootDir, "..", "uploads")
	}
	targetDir := filepath.Join(uploadDir, "users", "avatars")
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		log.Printf("[UserSeeder] cannot create local avatar dir %s: %v", targetDir, err)
		return result
	}

	for _, def := range defs {
		localPath := filepath.Join(assetsDir, def.avatarFile)
		raw, err := os.ReadFile(localPath)
		if err != nil {
			if os.IsNotExist(err) {
				log.Printf("[UserSeeder] avatar file not found: %s — skipping", def.avatarFile)
				continue
			}
			log.Printf("[UserSeeder] cannot read avatar %s: %v — skipping", def.avatarFile, err)
			continue
		}

		targetPath := filepath.Join(targetDir, def.avatarFile)
		if err := os.WriteFile(targetPath, raw, 0o644); err != nil {
			log.Printf("[UserSeeder] copy failed for %s: %v — skipping", def.avatarFile, err)
			continue
		}
		publicPath := "/uploads/users/avatars/" + def.avatarFile
		result[def.email] = publicPath
		log.Printf("[UserSeeder] copied avatar %s → %s", def.avatarFile, publicPath)
	}

	return result
}
