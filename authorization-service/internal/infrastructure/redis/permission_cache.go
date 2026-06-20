package redis

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	permissionCachePrefix = "user_permissions:"
	permissionCacheTTL    = 10 * time.Minute
)

type PermissionCache struct {
	client *redis.Client
}

func NewPermissionCache(client *redis.Client) *PermissionCache {
	return &PermissionCache{client: client}
}

func (c *PermissionCache) Get(ctx context.Context, userUUID string) ([]string, bool) {
	val, err := c.client.Get(ctx, permissionCachePrefix+userUUID).Bytes()
	if err != nil {
		return nil, false
	}
	var perms []string
	if err := json.Unmarshal(val, &perms); err != nil {
		return nil, false
	}
	return perms, true
}

func (c *PermissionCache) Set(ctx context.Context, userUUID string, perms []string) {
	data, err := json.Marshal(perms)
	if err != nil {
		return
	}
	_ = c.client.Set(ctx, permissionCachePrefix+userUUID, data, permissionCacheTTL).Err()
}

func (c *PermissionCache) Delete(ctx context.Context, userUUID string) {
	_ = c.client.Del(ctx, permissionCachePrefix+userUUID).Err()
}
