package http

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/modules/user/domain"
)

type routeUserServiceStub struct{}

func (routeUserServiceStub) CreateUser(context.Context, domain.CreateUserInput) (domain.User, error) {
	return domain.User{}, nil
}
func (routeUserServiceStub) GetUser(context.Context, string) (domain.User, error) {
	return domain.User{}, nil
}
func (routeUserServiceStub) ListUsers(context.Context, domain.ListUsersInput) (domain.ListUsersResult, error) {
	return domain.ListUsersResult{}, nil
}
func (routeUserServiceStub) UpdateUser(context.Context, domain.UpdateUserInput) (domain.User, error) {
	return domain.User{}, nil
}
func (routeUserServiceStub) UpdateProfile(context.Context, domain.UpdateProfileInput) (domain.User, error) {
	return domain.User{}, nil
}
func (routeUserServiceStub) ChangeUserStatus(_ context.Context, input domain.ChangeUserStatusInput) (domain.User, error) {
	return domain.User{UUID: input.UUID, Status: input.Status}, nil
}
func (routeUserServiceStub) DeleteUser(context.Context, string) error { return nil }

type routeAuthzStub struct{}

func (routeAuthzStub) Check(context.Context, string, string, string, string) (bool, string, error) {
	return true, "", nil
}

func TestStatusRoutesAreRegistered(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	v1 := router.Group("/api/v1")
	NewUserRoutes(NewUserHandler(routeUserServiceStub{}, nil), routeAuthzStub{}).Register(v1)

	cases := []string{
		"/api/v1/users/cef242e5-5c9e-4dfe-a5b7-ad003839d5f4/status",
		"/api/v1/user/status/cef242e5-5c9e-4dfe-a5b7-ad003839d5f4",
	}

	for _, path := range cases {
		req := httptest.NewRequest(http.MethodPatch, path, bytes.NewBufferString(`{"status":"inactive"}`))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		if resp.Code == http.StatusNotFound {
			t.Fatalf("PATCH %s must be registered, got 404", path)
		}
	}
}
