package usecase

import (
	"strings"

	"github.com/google/uuid"
	"github.com/tumlumtala/users-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
)

func normalizeUser(email, fullname string) (string, string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	fullname = strings.TrimSpace(fullname)
	if email == "" || !strings.Contains(email, "@") || fullname == "" {
		return "", "", domainerrors.ErrInvalidInput
	}
	return email, fullname, nil
}

func normalizeRole(value string, defaultRole entity.Role) (entity.Role, error) {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return defaultRole, nil
	}
	role := entity.Role(value)
	if !role.IsValid() {
		return "", domainerrors.ErrInvalidInput
	}
	return role, nil
}

func normalizeStatus(value string, defaultStatus entity.Status) (entity.Status, error) {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return defaultStatus, nil
	}
	status := entity.Status(value)
	if !status.IsValid() {
		return "", domainerrors.ErrInvalidInput
	}
	return status, nil
}

func validateUUID(value string) error {
	if _, err := uuid.Parse(value); err != nil {
		return domainerrors.ErrInvalidInput
	}
	return nil
}
