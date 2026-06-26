package routes

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	authdomain "github.com/tumlumtala/gateway/internal/modules/auth/domain"
	userdomain "github.com/tumlumtala/gateway/internal/modules/user/domain"
	userhttp "github.com/tumlumtala/gateway/internal/modules/user/http"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
)

type registerRouteUserServiceStub struct{}

func (registerRouteUserServiceStub) CreateUser(context.Context, userdomain.CreateUserInput) (userdomain.User, error) {
	return userdomain.User{}, nil
}
func (registerRouteUserServiceStub) GetUser(context.Context, string) (userdomain.User, error) {
	return userdomain.User{}, nil
}
func (registerRouteUserServiceStub) ListUsers(context.Context, userdomain.ListUsersInput) (userdomain.ListUsersResult, error) {
	return userdomain.ListUsersResult{}, nil
}
func (registerRouteUserServiceStub) UpdateUser(context.Context, userdomain.UpdateUserInput) (userdomain.User, error) {
	return userdomain.User{}, nil
}
func (registerRouteUserServiceStub) UpdateProfile(context.Context, userdomain.UpdateProfileInput) (userdomain.User, error) {
	return userdomain.User{}, nil
}
func (registerRouteUserServiceStub) ChangeUserStatus(_ context.Context, input userdomain.ChangeUserStatusInput) (userdomain.User, error) {
	return userdomain.User{UUID: input.UUID, Status: input.Status}, nil
}
func (registerRouteUserServiceStub) DeleteUser(context.Context, string) error { return nil }

type registerRouteAuthzStub struct{}

func (registerRouteAuthzStub) Check(context.Context, string, string, string, string) (bool, string, error) {
	return true, "", nil
}

func TestRegisterRoutesIncludesUserStatusRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	auth := func(c *gin.Context) {
		claims := authdomain.AccessClaims{UserID: "admin-user", Role: "administrator"}
		c.Request = c.Request.WithContext(contextx.WithClaims(c.Request.Context(), claims))
		c.Next()
	}

	RegisterRoutes(router, RegisterOptions{
		Logger:    zerolog.New(io.Discard),
		Auth:      auth,
		Timeout:   func(c *gin.Context) { c.Next() },
		RateLimit: func(c *gin.Context) { c.Next() },
	}, userhttp.NewUserRoutes(userhttp.NewUserHandler(registerRouteUserServiceStub{}, nil), registerRouteAuthzStub{}))

	for _, path := range []string{
		"/api/v1/users/cef242e5-5c9e-4dfe-a5b7-ad003839d5f4/status",
		"/api/v1/user/status/cef242e5-5c9e-4dfe-a5b7-ad003839d5f4",
	} {
		req := httptest.NewRequest(http.MethodPatch, path, bytes.NewBufferString(`{"status":"inactive"}`))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		if resp.Code == http.StatusNotFound {
			t.Fatalf("PATCH %s must be registered through RegisterRoutes, got 404", path)
		}
	}
}
