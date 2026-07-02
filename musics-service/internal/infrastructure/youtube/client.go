package youtube

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	youtubeentity "github.com/tumlumtala/musics-service/internal/module/domain/entity/youtube"
	youtuberepository "github.com/tumlumtala/musics-service/internal/module/domain/repository"
)

var ErrNotConfigured = errors.New("youtube api is not configured")

type Config struct {
	APIKey     string
	APIURL     string
	CacheTTL   time.Duration
	HTTPClient *http.Client
}

type SearchResult struct {
	Videos   []youtubeentity.Track `json:"videos"`
	CacheHit bool                  `json:"-"`
}

type Service struct {
	apiKey     string
	apiURL     string
	cacheTTL   time.Duration
	httpClient *http.Client
	cache      youtuberepository.YouTubeCacheRepository
	locks      sync.Map
}

func NewService(cache youtuberepository.YouTubeCacheRepository, cfg Config) *Service {
	apiURL := strings.TrimRight(strings.TrimSpace(cfg.APIURL), "/")
	if apiURL == "" {
		apiURL = "https://www.googleapis.com/youtube/v3"
	}
	cacheTTL := cfg.CacheTTL
	if cacheTTL <= 0 {
		cacheTTL = 30 * 24 * time.Hour
	}
	httpClient := cfg.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 12 * time.Second}
	}
	return &Service{
		apiKey:     strings.TrimSpace(cfg.APIKey),
		apiURL:     apiURL,
		cacheTTL:   cacheTTL,
		httpClient: httpClient,
		cache:      cache,
	}
}

func NormalizeKeyword(keyword string) string {
	return strings.ToLower(strings.Join(strings.Fields(keyword), " "))
}

func (s *Service) Search(ctx context.Context, keyword string, limit int) (*SearchResult, error) {
	keyword = strings.TrimSpace(keyword)
	normalized := NormalizeKeyword(keyword)
	if normalized == "" {
		return &SearchResult{Videos: []youtubeentity.Track{}}, nil
	}
	if limit < 1 {
		limit = 8
	}
	if limit > 10 {
		limit = 10
	}

	unlock := s.lock(normalized)
	defer unlock()

	now := time.Now()
	if s.cache != nil {
		tracks, hit, err := s.cache.GetYouTubeSearchCache(ctx, normalized, now, limit)
		if err != nil {
			return nil, fmt.Errorf("read youtube cache: %w", err)
		}
		if hit {
			return &SearchResult{Videos: tracks, CacheHit: true}, nil
		}
	}
	if s.apiKey == "" {
		return nil, ErrNotConfigured
	}

	videoIDs, err := s.searchVideoIDs(ctx, keyword, limit)
	if err != nil {
		return nil, err
	}
	tracks, err := s.fetchVideos(ctx, videoIDs)
	if err != nil {
		return nil, err
	}
	if s.cache != nil {
		query := youtubeentity.SearchQuery{
			Keyword:           keyword,
			NormalizedKeyword: normalized,
			ResultCount:       uint32(len(tracks)),
			CachedAt:          now,
			ExpiresAt:         now.Add(s.cacheTTL),
		}
		if err := s.cache.ReplaceYouTubeSearchCache(ctx, query, tracks); err != nil {
			return nil, fmt.Errorf("write youtube cache: %w", err)
		}
	}
	return &SearchResult{Videos: tracks}, nil
}

func (s *Service) GetVideo(
	ctx context.Context,
	videoID string,
) (*youtubeentity.Track, bool, error) {
	videoID = strings.TrimSpace(videoID)
	if videoID == "" {
		return nil, false, nil
	}
	now := time.Now()
	if s.cache != nil {
		track, hit, err := s.cache.GetCachedYouTubeVideo(ctx, videoID, now)
		if err != nil {
			return nil, false, fmt.Errorf("read youtube video cache: %w", err)
		}
		if hit {
			return track, true, nil
		}
	}
	if s.apiKey == "" {
		return nil, false, ErrNotConfigured
	}

	tracks, err := s.fetchVideos(ctx, []string{videoID})
	if err != nil {
		return nil, false, err
	}
	if len(tracks) == 0 {
		return nil, false, nil
	}
	if s.cache != nil {
		keyword := "video:" + videoID
		query := youtubeentity.SearchQuery{
			Keyword:           keyword,
			NormalizedKeyword: keyword,
			ResultCount:       1,
			CachedAt:          now,
			ExpiresAt:         now.Add(s.cacheTTL),
		}
		if err := s.cache.ReplaceYouTubeSearchCache(ctx, query, tracks); err != nil {
			return nil, false, fmt.Errorf("write youtube video cache: %w", err)
		}
	}
	return &tracks[0], false, nil
}

func (s *Service) lock(key string) func() {
	value, _ := s.locks.LoadOrStore(key, &sync.Mutex{})
	mutex := value.(*sync.Mutex)
	mutex.Lock()
	return mutex.Unlock
}

type searchResponse struct {
	Items []struct {
		ID struct {
			VideoID string `json:"videoId"`
		} `json:"id"`
	} `json:"items"`
}

func (s *Service) searchVideoIDs(
	ctx context.Context,
	keyword string,
	limit int,
) ([]string, error) {
	params := url.Values{
		"key":             {s.apiKey},
		"part":            {"snippet"},
		"q":               {keyword},
		"type":            {"video"},
		"videoEmbeddable": {"true"},
		"videoSyndicated": {"true"},
		"maxResults":      {strconv.Itoa(limit)},
	}
	var payload searchResponse
	if err := s.getJSON(ctx, "/search", params, &payload); err != nil {
		return nil, fmt.Errorf("youtube search.list: %w", err)
	}
	ids := make([]string, 0, len(payload.Items))
	seen := make(map[string]struct{}, len(payload.Items))
	for _, item := range payload.Items {
		id := strings.TrimSpace(item.ID.VideoID)
		if id == "" {
			continue
		}
		if _, exists := seen[id]; exists {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}
	return ids, nil
}

type videoResponse struct {
	Items []struct {
		ID      string `json:"id"`
		Snippet struct {
			Title        string `json:"title"`
			ChannelTitle string `json:"channelTitle"`
			PublishedAt  string `json:"publishedAt"`
			Thumbnails   struct {
				High    thumbnail `json:"high"`
				Medium  thumbnail `json:"medium"`
				Default thumbnail `json:"default"`
			} `json:"thumbnails"`
		} `json:"snippet"`
		ContentDetails struct {
			Duration string `json:"duration"`
		} `json:"contentDetails"`
		Statistics struct {
			ViewCount string `json:"viewCount"`
		} `json:"statistics"`
		Status struct {
			Embeddable    *bool  `json:"embeddable"`
			PrivacyStatus string `json:"privacyStatus"`
			UploadStatus  string `json:"uploadStatus"`
		} `json:"status"`
	} `json:"items"`
}

type thumbnail struct {
	URL string `json:"url"`
}

func (s *Service) fetchVideos(
	ctx context.Context,
	videoIDs []string,
) ([]youtubeentity.Track, error) {
	if len(videoIDs) == 0 {
		return []youtubeentity.Track{}, nil
	}
	params := url.Values{
		"key":  {s.apiKey},
		"part": {"snippet,contentDetails,statistics,status"},
		"id":   {strings.Join(videoIDs, ",")},
	}
	var payload videoResponse
	if err := s.getJSON(ctx, "/videos", params, &payload); err != nil {
		return nil, fmt.Errorf("youtube videos.list: %w", err)
	}

	byID := make(map[string]youtubeentity.Track, len(payload.Items))
	for _, item := range payload.Items {
		if item.ID == "" ||
			(item.Status.Embeddable != nil && !*item.Status.Embeddable) ||
			item.Status.PrivacyStatus == "private" ||
			item.Status.UploadStatus == "deleted" ||
			item.Status.UploadStatus == "rejected" {
			continue
		}
		var publishedAt *time.Time
		if parsed, err := time.Parse(time.RFC3339, item.Snippet.PublishedAt); err == nil {
			publishedAt = &parsed
		}
		var duration *uint32
		if seconds, ok := parseISODuration(item.ContentDetails.Duration); ok {
			duration = &seconds
		}
		viewCount, _ := strconv.ParseUint(item.Statistics.ViewCount, 10, 64)
		thumbnailURL := item.Snippet.Thumbnails.High.URL
		if thumbnailURL == "" {
			thumbnailURL = item.Snippet.Thumbnails.Medium.URL
		}
		if thumbnailURL == "" {
			thumbnailURL = item.Snippet.Thumbnails.Default.URL
		}
		byID[item.ID] = youtubeentity.Track{
			VideoID:      item.ID,
			Title:        html.UnescapeString(item.Snippet.Title),
			Thumbnail:    thumbnailURL,
			ChannelTitle: html.UnescapeString(item.Snippet.ChannelTitle),
			Duration:     duration,
			ViewCount:    viewCount,
			PublishedAt:  publishedAt,
		}
	}

	tracks := make([]youtubeentity.Track, 0, len(byID))
	for _, id := range videoIDs {
		if track, exists := byID[id]; exists {
			tracks = append(tracks, track)
		}
	}
	return tracks, nil
}

func (s *Service) getJSON(
	ctx context.Context,
	path string,
	params url.Values,
	target any,
) error {
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		s.apiURL+path+"?"+params.Encode(),
		nil,
	)
	if err != nil {
		return err
	}
	response, err := s.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("HTTP %d", response.StatusCode)
	}
	return json.NewDecoder(response.Body).Decode(target)
}

var isoDurationPattern = regexp.MustCompile(
	`^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$`,
)

func parseISODuration(value string) (uint32, bool) {
	match := isoDurationPattern.FindStringSubmatch(value)
	if match == nil {
		return 0, false
	}
	parse := func(raw string) uint64 {
		value, _ := strconv.ParseUint(raw, 10, 32)
		return value
	}
	seconds := parse(match[1])*86400 +
		parse(match[2])*3600 +
		parse(match[3])*60 +
		parse(match[4])
	if seconds > uint64(^uint32(0)) {
		return 0, false
	}
	return uint32(seconds), true
}
