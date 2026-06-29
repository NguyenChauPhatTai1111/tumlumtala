package http

import (
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRegisterRoutesExposesCompleteMusicAPI(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	RegisterRoutes(router, nil, "test-secret")

	registered := make(map[string]struct{})
	for _, route := range router.Routes() {
		registered[route.Method+" "+route.Path] = struct{}{}
	}

	expected := []string{
		"GET /api/v1/music/liked",
		"POST /api/v1/music/liked",
		"DELETE /api/v1/music/liked/:source_id",
		"GET /api/v1/music/recent",
		"POST /api/v1/music/recent",
		"GET /api/v1/music/search-history",
		"POST /api/v1/music/search-history",
		"GET /api/v1/music/playlists",
		"POST /api/v1/music/playlists",
		"DELETE /api/v1/music/playlists/:playlist_id",
		"POST /api/v1/music/playlists/:playlist_id/tracks",
		"GET /api/v1/music/library",
		"POST /api/v1/music/library",
		"DELETE /api/v1/music/library/:item_id",
		"GET /api/v1/music/events",
		"POST /api/v1/music/events",
		"GET /api/v1/music/dna",
		"POST /api/v1/music/ai/sessions",
		"GET /api/v1/music/ai/sessions/:session_id",
		"POST /api/v1/music/ai/sessions/:session_id/candidates",
		"POST /api/v1/music/ai/sessions/:session_id/messages",
		"POST /api/v1/music/smart-queue",
		"POST /api/v1/music/radio",
		"POST /api/v1/music/dynamic-playlist",
		"GET /api/v1/music/insights/journey",
		"GET /api/v1/music/insights/heatmap",
		"GET /api/v1/music/discover",
		"GET /api/v1/music/challenges",
		"POST /api/v1/music/explain",
		"POST /api/v1/music/compare",
		"POST /api/v1/music/album-review",
		"POST /api/v1/music/remix-discovery",
		"POST /api/v1/music/sync/rooms",
		"POST /api/v1/music/sync/rooms/join",
		"POST /api/v1/music/sync/rooms/:room_id/recommendations",
	}

	for _, route := range expected {
		if _, ok := registered[route]; !ok {
			t.Errorf("music API route is not registered: %s", route)
		}
	}
}
