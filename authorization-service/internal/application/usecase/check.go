package usecase

import (
	"context"
	"fmt"
)

type PermissionQuery interface {
	GetPermissionsByUserUUID(ctx context.Context, userUUID string) ([]string, error)
}

type PermissionCache interface {
	Get(ctx context.Context, userUUID string) ([]string, bool)
	Set(ctx context.Context, userUUID string, perms []string)
}

type CheckInput struct {
	UserUUID string
	Service  string
	Resource string
	Action   string
}

type CheckUseCase struct {
	query PermissionQuery
	cache PermissionCache
}

func NewCheckUseCase(query PermissionQuery, cache PermissionCache) *CheckUseCase {
	return &CheckUseCase{query: query, cache: cache}
}

func (uc *CheckUseCase) Execute(ctx context.Context, input CheckInput) (bool, string, error) {
	required := fmt.Sprintf("%s.%s", input.Resource, input.Action)

	perms, ok := uc.cache.Get(ctx, input.UserUUID)
	if !ok {
		var err error
		perms, err = uc.query.GetPermissionsByUserUUID(ctx, input.UserUUID)
		if err != nil {
			return false, "internal error", err
		}
		uc.cache.Set(ctx, input.UserUUID, perms)
	}

	for _, p := range perms {
		if p == required {
			return true, "", nil
		}
	}

	return false, fmt.Sprintf("user does not have permission %q", required), nil
}
