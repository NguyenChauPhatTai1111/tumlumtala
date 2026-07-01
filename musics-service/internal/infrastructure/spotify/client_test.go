package spotify

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
)

func TestSearchTracksUsesClientCredentialsAndCachesToken(t *testing.T) {
	var tokenRequests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/token":
			tokenRequests.Add(1)
			expected := "Basic " + base64.StdEncoding.EncodeToString([]byte("client:secret"))
			if r.Header.Get("Authorization") != expected {
				t.Fatalf("unexpected token authorization header: %s", r.Header.Get("Authorization"))
			}
			if err := r.ParseForm(); err != nil || r.Form.Get("grant_type") != "client_credentials" {
				t.Fatal("missing client_credentials grant")
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"access_token": "test-token",
				"expires_in":   3600,
			})
		case "/v1/search":
			if r.Header.Get("Authorization") != "Bearer test-token" {
				t.Fatal("missing Spotify bearer token")
			}
			if r.URL.Query().Get("market") != "VN" ||
				r.URL.Query().Get("type") != "track" ||
				r.URL.Query().Get("limit") != "10" {
				t.Fatalf("unexpected search query: %s", r.URL.RawQuery)
			}
			_, _ = w.Write([]byte(`{
				"tracks": {"items": [{
					"id": "track-1",
					"name": "Bài hát",
					"duration_ms": 180000,
					"popularity": 90,
					"artists": [{"id": "artist-1", "name": "Nghệ sĩ"}],
					"album": {
						"name": "Album",
						"release_date": "2026-01-01",
						"images": [{"url": "https://image.test/cover.jpg", "width": 640, "height": 640}]
					},
					"external_urls": {"spotify": "https://open.spotify.com/track/track-1"}
				}]}
			}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client := NewClient(Config{ClientID: "client", ClientSecret: "secret", Market: "vn"})
	client.tokenURL = server.URL + "/api/token"
	client.apiURL = server.URL + "/v1"

	for range 2 {
		tracks, err := client.SearchTracks(context.Background(), "bài hát", 50, 0)
		if err != nil {
			t.Fatalf("search tracks: %v", err)
		}
		if len(tracks) != 1 || tracks[0].Provider != "spotify" ||
			tracks[0].Duration != 180 || tracks[0].User.Name != "Nghệ sĩ" {
			t.Fatalf("unexpected mapped track: %+v", tracks)
		}
	}
	if tokenRequests.Load() != 1 {
		t.Fatalf("expected one cached token request, got %d", tokenRequests.Load())
	}
}

func TestSearchTracksRequiresCredentials(t *testing.T) {
	client := NewClient(Config{})
	if _, err := client.SearchTracks(context.Background(), "music", 10, 0); err != ErrNotConfigured {
		t.Fatalf("expected ErrNotConfigured, got %v", err)
	}
}
