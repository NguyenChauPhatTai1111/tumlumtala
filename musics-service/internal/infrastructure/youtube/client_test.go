package youtube

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	youtubeentity "github.com/tumlumtala/musics-service/internal/module/domain/entity/youtube"
)

type memoryCache struct {
	mu      sync.Mutex
	queries map[string]youtubeentity.SearchQuery
	tracks  map[string][]youtubeentity.Track
}

func newMemoryCache() *memoryCache {
	return &memoryCache{
		queries: make(map[string]youtubeentity.SearchQuery),
		tracks:  make(map[string][]youtubeentity.Track),
	}
}

func (cache *memoryCache) GetYouTubeSearchCache(
	_ context.Context,
	normalizedKeyword string,
	now time.Time,
	limit int,
) ([]youtubeentity.Track, bool, error) {
	cache.mu.Lock()
	defer cache.mu.Unlock()
	query, exists := cache.queries[normalizedKeyword]
	if !exists || !query.ExpiresAt.After(now) {
		return nil, false, nil
	}
	tracks := append([]youtubeentity.Track(nil), cache.tracks[normalizedKeyword]...)
	if limit > 0 && len(tracks) > limit {
		tracks = tracks[:limit]
	}
	return tracks, true, nil
}

func (cache *memoryCache) ReplaceYouTubeSearchCache(
	_ context.Context,
	query youtubeentity.SearchQuery,
	tracks []youtubeentity.Track,
) error {
	cache.mu.Lock()
	defer cache.mu.Unlock()
	cache.queries[query.NormalizedKeyword] = query
	cache.tracks[query.NormalizedKeyword] = append([]youtubeentity.Track(nil), tracks...)
	return nil
}

func (cache *memoryCache) GetCachedYouTubeVideo(
	_ context.Context,
	videoID string,
	now time.Time,
) (*youtubeentity.Track, bool, error) {
	cache.mu.Lock()
	defer cache.mu.Unlock()
	for keyword, tracks := range cache.tracks {
		query := cache.queries[keyword]
		if !query.ExpiresAt.After(now) {
			continue
		}
		for _, track := range tracks {
			if track.VideoID == videoID {
				copy := track
				return &copy, true, nil
			}
		}
	}
	return nil, false, nil
}

func TestSearchReturnsDatabaseCacheWithoutCallingYouTube(t *testing.T) {
	cache := newMemoryCache()
	now := time.Now()
	cache.queries["yoasobi"] = youtubeentity.SearchQuery{
		NormalizedKeyword: "yoasobi",
		ResultCount:       1,
		CachedAt:          now,
		ExpiresAt:         now.Add(time.Hour),
	}
	cache.tracks["yoasobi"] = []youtubeentity.Track{{
		VideoID: "cached-video",
		Title:   "Cached",
	}}
	service := NewService(cache, Config{})

	result, err := service.Search(context.Background(), "  YOASOBI  ", 8)
	if err != nil {
		t.Fatalf("Search returned error: %v", err)
	}
	if !result.CacheHit {
		t.Fatal("expected cache hit")
	}
	if len(result.Videos) != 1 || result.Videos[0].VideoID != "cached-video" {
		t.Fatalf("unexpected cached videos: %#v", result.Videos)
	}
}

func TestSearchMissCallsYouTubeOnceThenCachesResult(t *testing.T) {
	var mu sync.Mutex
	searchCalls := 0
	videoCalls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		switch r.URL.Path {
		case "/search":
			searchCalls++
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"items":[{"id":{"videoId":"video-1"}}]}`))
		case "/videos":
			videoCalls++
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"items":[{
				"id":"video-1",
				"snippet":{
					"title":"YOASOBI - Idol",
					"channelTitle":"Ayase / YOASOBI",
					"publishedAt":"2024-01-02T03:04:05Z",
					"thumbnails":{"high":{"url":"https://img.test/video-1.jpg"}}
				},
				"contentDetails":{"duration":"PT3M12S"},
				"statistics":{"viewCount":"123456"},
				"status":{"embeddable":true,"privacyStatus":"public","uploadStatus":"processed"}
			}]}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	cache := newMemoryCache()
	service := NewService(cache, Config{
		APIKey:     "test-key",
		APIURL:     server.URL,
		CacheTTL:   time.Hour,
		HTTPClient: server.Client(),
	})

	first, err := service.Search(context.Background(), "YOASOBI Idol", 8)
	if err != nil {
		t.Fatalf("first Search returned error: %v", err)
	}
	if first.CacheHit {
		t.Fatal("first search must be a cache miss")
	}
	if len(first.Videos) != 1 || first.Videos[0].Duration == nil ||
		*first.Videos[0].Duration != 192 {
		t.Fatalf("unexpected first result: %#v", first.Videos)
	}

	second, err := service.Search(context.Background(), "  yoasobi   idol ", 8)
	if err != nil {
		t.Fatalf("second Search returned error: %v", err)
	}
	if !second.CacheHit {
		t.Fatal("second search must be a cache hit")
	}

	mu.Lock()
	defer mu.Unlock()
	if searchCalls != 1 || videoCalls != 1 {
		t.Fatalf("unexpected YouTube calls: search=%d videos=%d", searchCalls, videoCalls)
	}
}

func TestGetVideoUsesVideosListWithoutSearchList(t *testing.T) {
	searchCalled := false
	videoCalled := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/search":
			searchCalled = true
			http.Error(w, "search.list must not be called", http.StatusInternalServerError)
		case "/videos":
			videoCalled = true
			if r.URL.Query().Get("id") != "known-video-id" {
				t.Fatalf("unexpected video id: %s", r.URL.Query().Get("id"))
			}
			if !strings.Contains(r.URL.Query().Get("part"), "contentDetails") {
				t.Fatalf("videos.list is missing contentDetails: %s", r.URL.RawQuery)
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"items":[{
				"id":"known-video-id",
				"snippet":{"title":"Known","channelTitle":"Channel","thumbnails":{}},
				"contentDetails":{"duration":"PT2M"},
				"statistics":{"viewCount":"5"},
				"status":{"embeddable":true,"privacyStatus":"public","uploadStatus":"processed"}
			}]}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	service := NewService(newMemoryCache(), Config{
		APIKey:     "test-key",
		APIURL:     server.URL,
		HTTPClient: server.Client(),
	})
	video, cacheHit, err := service.GetVideo(context.Background(), "known-video-id")
	if err != nil {
		t.Fatalf("GetVideo returned error: %v", err)
	}
	if cacheHit || video == nil || video.VideoID != "known-video-id" {
		t.Fatalf("unexpected video result: hit=%v video=%#v", cacheHit, video)
	}
	if searchCalled || !videoCalled {
		t.Fatalf("unexpected API usage: search=%v videos=%v", searchCalled, videoCalled)
	}
}
