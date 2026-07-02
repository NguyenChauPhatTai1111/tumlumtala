package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/tumlumtala/musics-service/internal/infrastructure/spotify"
)

func TestMoodRecommendationsDoNotRequireSeed(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := &Handler{
		spotify: spotify.NewClient(spotify.Config{}),
	}
	router := gin.New()
	router.GET("/recommendations", handler.GetSpotifyRecommendations)

	request := httptest.NewRequest(
		http.MethodGet,
		"/recommendations?mood=focus&limit=24",
		nil,
	)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected 200 for mood-only request, got %d: %s", response.Code, response.Body.String())
	}
	if strings.Contains(response.Body.String(), "seed_track") {
		t.Fatalf("mood-only request incorrectly required a seed: %s", response.Body.String())
	}
}

func TestRecommendationsWithoutMoodOrSeedRemainInvalid(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := &Handler{
		spotify: spotify.NewClient(spotify.Config{}),
	}
	router := gin.New()
	router.GET("/recommendations", handler.GetSpotifyRecommendations)

	request := httptest.NewRequest(http.MethodGet, "/recommendations", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 without mood or seed, got %d: %s", response.Code, response.Body.String())
	}
}
