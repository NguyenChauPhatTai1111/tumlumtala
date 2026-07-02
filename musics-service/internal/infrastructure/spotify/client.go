package spotify

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

var ErrNotConfigured = errors.New("Spotify chưa được cấu hình")

type Config struct {
	ClientID     string
	ClientSecret string
	Market       string
}

type Artist struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Artwork struct {
	Small  string `json:"150x150,omitempty"`
	Medium string `json:"480x480,omitempty"`
	Large  string `json:"1000x1000,omitempty"`
}

type AlbumInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ArtistSummary struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Images      []string `json:"images"`
	ExternalURL string   `json:"external_url"`
}

type CollectionSummary struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description,omitempty"`
	Type        string   `json:"type"`
	Images      []string `json:"images"`
	Owner       Artist   `json:"owner"`
	TotalItems  int      `json:"total_items,omitempty"`
	ReleaseDate string   `json:"release_date,omitempty"`
	ExternalURL string   `json:"external_url"`
}

type Track struct {
	ID          string    `json:"id"`
	Provider    string    `json:"provider"`
	Title       string    `json:"title"`
	Duration    int       `json:"duration"`
	CreatedAt   string    `json:"created_at,omitempty"`
	User        Artist    `json:"user"`
	Artists     []Artist  `json:"artists,omitempty"`
	Artwork     Artwork   `json:"artwork"`
	Album       AlbumInfo `json:"album,omitempty"`
	PlayCount   int       `json:"play_count,omitempty"`
	ExternalURL string    `json:"external_url"`
}

type Client struct {
	client       *http.Client
	clientID     string
	clientSecret string
	market       string
	tokenURL     string
	apiURL       string

	mu          sync.Mutex
	accessToken string
	tokenExpiry time.Time
}

func NewClient(cfg Config) *Client {
	market := strings.ToUpper(strings.TrimSpace(cfg.Market))
	if market == "" {
		market = "VN"
	}
	return &Client{
		client:       &http.Client{Timeout: 10 * time.Second},
		clientID:     strings.TrimSpace(cfg.ClientID),
		clientSecret: strings.TrimSpace(cfg.ClientSecret),
		market:       market,
		tokenURL:     "https://accounts.spotify.com/api/token",
		apiURL:       "https://api.spotify.com/v1",
	}
}

func (c *Client) SearchTracks(ctx context.Context, query string, limit, offset int) ([]Track, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return []Track{}, nil
	}
	if c.clientID == "" || c.clientSecret == "" {
		return nil, ErrNotConfigured
	}
	if limit < 1 {
		limit = 10
	}
	if limit > 10 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	if offset > 1000 {
		offset = 1000
	}

	token, err := c.token(ctx)
	if err != nil {
		return nil, err
	}
	tracks, status, err := c.search(ctx, token, query, limit, offset)
	if err == nil || status != http.StatusUnauthorized {
		return tracks, err
	}

	c.invalidateToken()
	token, err = c.token(ctx)
	if err != nil {
		return nil, err
	}
	tracks, _, err = c.search(ctx, token, query, limit, offset)
	return tracks, err
}

func (c *Client) SearchArtists(ctx context.Context, query string, limit int) ([]ArtistSummary, error) {
	if strings.TrimSpace(query) == "" {
		return []ArtistSummary{}, nil
	}
	token, err := c.authorizedToken(ctx)
	if err != nil {
		return nil, err
	}
	items, status, err := c.searchArtists(ctx, token, query, clampSearchLimit(limit))
	if err == nil || status != http.StatusUnauthorized {
		return items, err
	}
	c.invalidateToken()
	token, err = c.token(ctx)
	if err != nil {
		return nil, err
	}
	items, _, err = c.searchArtists(ctx, token, query, clampSearchLimit(limit))
	return items, err
}

func (c *Client) SearchCollections(ctx context.Context, query, itemType string, limit int) ([]CollectionSummary, error) {
	if strings.TrimSpace(query) == "" {
		return []CollectionSummary{}, nil
	}
	if itemType != "album" && itemType != "playlist" {
		return nil, fmt.Errorf("Spotify collection type không hợp lệ: %s", itemType)
	}
	token, err := c.authorizedToken(ctx)
	if err != nil {
		return nil, err
	}
	items, status, err := c.searchCollections(ctx, token, query, itemType, clampSearchLimit(limit))
	if err == nil || status != http.StatusUnauthorized {
		return items, err
	}
	c.invalidateToken()
	token, err = c.token(ctx)
	if err != nil {
		return nil, err
	}
	items, _, err = c.searchCollections(ctx, token, query, itemType, clampSearchLimit(limit))
	return items, err
}

func (c *Client) GetSimilarTracks(
	ctx context.Context,
	seedTrackID, seedArtist, seedGenre string,
	limit int,
) ([]Track, error) {
	limit = clampDiscoveryLimit(limit)
	seedTrackID = strings.TrimSpace(seedTrackID)
	seedArtist = strings.TrimSpace(seedArtist)
	seedGenre = strings.TrimSpace(seedGenre)

	var seedArtistID string
	if seedTrackID != "" {
		track, err := c.GetTrack(ctx, seedTrackID)
		if err == nil && track != nil {
			seedArtist = firstNonEmpty(seedArtist, track.User.Name)
			seedArtistID = track.User.ID
		}
	}

	genres := make([]string, 0, 4)
	if seedGenre != "" {
		genres = append(genres, seedGenre)
	}
	if seedArtistID != "" {
		artist, err := c.GetArtist(ctx, seedArtistID)
		if err == nil && artist != nil {
			genres = append(genres, artist.Genres...)
		}
	}

	currentYear := time.Now().Year()
	queries := make([]string, 0, len(genres)+1)
	for _, genre := range uniqueStrings(genres) {
		queries = append(queries, fmt.Sprintf(`genre:"%s" year:%d-%d`, genre, currentYear-1, currentYear))
	}
	if seedArtist != "" {
		queries = append(queries, fmt.Sprintf(`artist:"%s"`, seedArtist))
	}
	if len(queries) == 0 {
		// No genre or artist data available; nothing to search with
		return []Track{}, nil
	}

	hasGenreQuery := len(uniqueStrings(genres)) > 0

	result := make([]Track, 0, limit)
	seen := map[string]struct{}{seedTrackID: {}}
	for _, query := range queries {
		tracks, err := c.SearchTracks(ctx, query, 10, 0)
		if err != nil {
			continue
		}
		for _, track := range tracks {
			if _, exists := seen[track.ID]; exists {
				continue
			}
			// Only diversify away from seed artist when genre queries also exist,
			// so a pure artist query still returns results.
			if hasGenreQuery && seedArtistID != "" && track.User.ID == seedArtistID && len(result) < limit/2 {
				continue
			}
			seen[track.ID] = struct{}{}
			result = append(result, track)
			if len(result) >= limit {
				return result, nil
			}
		}
	}
	return result, nil
}

func (c *Client) DiscoverTracks(ctx context.Context, genre, timeRange string, limit int) ([]Track, error) {
	limit = clampDiscoveryLimit(limit)
	currentYear := time.Now().Year()
	yearFilter := fmt.Sprintf(" year:%d", currentYear)
	if timeRange == "allTime" {
		yearFilter = ""
	}

	genres := []string{"pop", "hip-hop", "dance", "rock"}
	if normalized := normalizeGenre(genre); normalized != "" {
		genres = []string{normalized}
	}
	result := make([]Track, 0, limit)
	seen := make(map[string]struct{})
	for _, item := range genres {
		tracks, err := c.SearchTracks(ctx, fmt.Sprintf(`genre:"%s"%s`, item, yearFilter), 10, 0)
		if err != nil {
			continue
		}
		for _, track := range tracks {
			if _, exists := seen[track.ID]; exists {
				continue
			}
			seen[track.ID] = struct{}{}
			result = append(result, track)
			if len(result) >= limit {
				return result, nil
			}
		}
	}
	return result, nil
}

func (c *Client) DiscoverArtists(ctx context.Context, limit int) ([]ArtistSummary, error) {
	limit = clampDiscoveryLimit(limit)
	result := make([]ArtistSummary, 0, limit)
	seen := make(map[string]struct{})
	for _, genre := range []string{"pop", "hip-hop", "dance", "rock"} {
		artists, err := c.SearchArtists(ctx, "genre:"+genre, 10)
		if err != nil {
			continue
		}
		for _, artist := range artists {
			if _, exists := seen[artist.ID]; exists {
				continue
			}
			seen[artist.ID] = struct{}{}
			result = append(result, artist)
			if len(result) >= limit {
				return result, nil
			}
		}
	}
	return result, nil
}

func (c *Client) DiscoverAlbums(ctx context.Context, limit int) ([]CollectionSummary, error) {
	limit = clampDiscoveryLimit(limit)
	albums, err := c.SearchCollections(ctx, "tag:new", "album", min(limit, 10))
	if err == nil && len(albums) >= limit {
		return albums[:limit], nil
	}
	seen := make(map[string]struct{})
	result := make([]CollectionSummary, 0, limit)
	for _, album := range albums {
		seen[album.ID] = struct{}{}
		result = append(result, album)
	}
	query := fmt.Sprintf("year:%d", time.Now().Year())
	more, moreErr := c.SearchCollections(ctx, query, "album", 10)
	if err != nil && moreErr != nil {
		return nil, err
	}
	for _, album := range more {
		if _, exists := seen[album.ID]; exists {
			continue
		}
		result = append(result, album)
		if len(result) >= limit {
			break
		}
	}
	return result, nil
}

func (c *Client) DiscoverPlaylists(ctx context.Context, limit int) ([]CollectionSummary, error) {
	limit = clampDiscoveryLimit(limit)
	result := make([]CollectionSummary, 0, limit)
	seen := make(map[string]struct{})
	for _, query := range []string{"Top Hits Vietnam", "Viral Hits", "New Music Friday"} {
		playlists, err := c.SearchCollections(ctx, query, "playlist", 10)
		if err != nil {
			continue
		}
		for _, playlist := range playlists {
			if _, exists := seen[playlist.ID]; exists {
				continue
			}
			seen[playlist.ID] = struct{}{}
			result = append(result, playlist)
			if len(result) >= limit {
				return result, nil
			}
		}
	}
	return result, nil
}

type Category struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon"`
}

// GetNewReleases fetches new album releases via search (browse endpoint deprecated 2024).
// tag:new filter has a max limit of 10 on Spotify search.
func (c *Client) GetNewReleases(ctx context.Context, limit int) ([]CollectionSummary, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return nil, ErrNotConfigured
	}
	if limit < 1 || limit > 10 {
		limit = 10
	}
	token, err := c.token(ctx)
	if err != nil {
		return nil, err
	}
	params := url.Values{
		"q":      {"tag:new"},
		"type":   {"album"},
		"market": {"VN"},
		"limit":  {strconv.Itoa(limit)},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.apiURL+"/search?"+params.Encode(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusUnauthorized {
		c.invalidateToken()
		return c.GetNewReleases(ctx, limit)
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(io.LimitReader(res.Body, 512))
		return nil, fmt.Errorf("Spotify GetNewReleases trả về HTTP %d: %s", res.StatusCode, bodyBytes)
	}
	var payload struct {
		Albums struct {
			Items []struct {
				ID          string `json:"id"`
				Name        string `json:"name"`
				AlbumType   string `json:"album_type"`
				ReleaseDate string `json:"release_date"`
				Images      []struct {
					URL string `json:"url"`
				} `json:"images"`
				Artists []struct {
					Name string `json:"name"`
				} `json:"artists"`
				ExternalURLs struct {
					Spotify string `json:"spotify"`
				} `json:"external_urls"`
			} `json:"items"`
		} `json:"albums"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&payload); err != nil {
		return nil, err
	}
	result := make([]CollectionSummary, 0, len(payload.Albums.Items))
	for _, item := range payload.Albums.Items {
		if item.ID == "" {
			continue
		}
		images := make([]string, 0, len(item.Images))
		for _, img := range item.Images {
			if img.URL != "" {
				images = append(images, img.URL)
			}
		}
		artistName := ""
		if len(item.Artists) > 0 {
			artistName = item.Artists[0].Name
		}
		result = append(result, CollectionSummary{
			ID:          item.ID,
			Name:        item.Name,
			Type:        item.AlbumType,
			Images:      images,
			Owner:       Artist{Name: artistName},
			ReleaseDate: item.ReleaseDate,
			ExternalURL: item.ExternalURLs.Spotify,
		})
	}
	return result, nil
}

// GetFeaturedPlaylists fetches editorial playlists via search (browse endpoint deprecated 2024).
// Spotify search with client credentials caps at limit=10.
func (c *Client) GetFeaturedPlaylists(ctx context.Context, limit int) ([]CollectionSummary, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return nil, ErrNotConfigured
	}
	if limit < 1 || limit > 10 {
		limit = 10
	}
	token, err := c.token(ctx)
	if err != nil {
		return nil, err
	}
	params := url.Values{
		"q":      {"top hits playlist 2024"},
		"type":   {"playlist"},
		"market": {"VN"},
		"limit":  {strconv.Itoa(limit)},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.apiURL+"/search?"+params.Encode(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusUnauthorized {
		c.invalidateToken()
		return c.GetFeaturedPlaylists(ctx, limit)
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(io.LimitReader(res.Body, 512))
		return nil, fmt.Errorf("Spotify GetFeaturedPlaylists trả về HTTP %d: %s", res.StatusCode, bodyBytes)
	}
	var payload struct {
		Playlists struct {
			Items []struct {
				ID          string `json:"id"`
				Name        string `json:"name"`
				Description string `json:"description"`
				Images      []struct {
					URL string `json:"url"`
				} `json:"images"`
				Owner struct {
					ID          string `json:"id"`
					DisplayName string `json:"display_name"`
				} `json:"owner"`
				Tracks struct {
					Total int `json:"total"`
				} `json:"tracks"`
				ExternalURLs struct {
					Spotify string `json:"spotify"`
				} `json:"external_urls"`
			} `json:"items"`
		} `json:"playlists"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&payload); err != nil {
		return nil, err
	}
	result := make([]CollectionSummary, 0, len(payload.Playlists.Items))
	for _, item := range payload.Playlists.Items {
		if item.ID == "" {
			continue
		}
		images := make([]string, 0, len(item.Images))
		for _, img := range item.Images {
			if img.URL != "" {
				images = append(images, img.URL)
			}
		}
		result = append(result, CollectionSummary{
			ID:          item.ID,
			Name:        item.Name,
			Description: item.Description,
			Type:        "playlist",
			Images:      images,
			Owner:       Artist{ID: item.Owner.ID, Name: item.Owner.DisplayName},
			TotalItems:  item.Tracks.Total,
			ExternalURL: item.ExternalURLs.Spotify,
		})
	}
	return result, nil
}

// GetCategories returns a hardcoded genre list (browse/categories deprecated 2024).
func (c *Client) GetCategories(_ context.Context, limit int) ([]Category, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return nil, ErrNotConfigured
	}
	all := []Category{
		{ID: "pop", Name: "Pop"},
		{ID: "hiphop", Name: "Hip-Hop"},
		{ID: "rnb", Name: "R&B"},
		{ID: "rock", Name: "Rock"},
		{ID: "electronic", Name: "Electronic"},
		{ID: "indie", Name: "Indie"},
		{ID: "jazz", Name: "Jazz"},
		{ID: "classical", Name: "Classical"},
		{ID: "kpop", Name: "K-Pop"},
		{ID: "vpop", Name: "V-Pop"},
		{ID: "latin", Name: "Latin"},
		{ID: "soul", Name: "Soul"},
		{ID: "metal", Name: "Metal"},
		{ID: "country", Name: "Country"},
		{ID: "reggae", Name: "Reggae"},
		{ID: "blues", Name: "Blues"},
		{ID: "folk", Name: "Folk"},
		{ID: "punk", Name: "Punk"},
		{ID: "afrobeats", Name: "Afrobeats"},
		{ID: "chill", Name: "Chill"},
	}
	if limit < 1 || limit > len(all) {
		limit = len(all)
	}
	return all[:limit], nil
}

// GetCategoryPlaylists fetches playlists for a genre via search (browse endpoint deprecated 2024).
// Spotify search with client credentials caps at limit=10.
func (c *Client) GetCategoryPlaylists(ctx context.Context, categoryID string, limit int) ([]CollectionSummary, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return nil, ErrNotConfigured
	}
	if limit < 1 || limit > 10 {
		limit = 10
	}
	token, err := c.token(ctx)
	if err != nil {
		return nil, err
	}
	params := url.Values{
		"q":      {categoryID + " playlist"},
		"type":   {"playlist"},
		"market": {"VN"},
		"limit":  {strconv.Itoa(limit)},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.apiURL+"/search?"+params.Encode(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusUnauthorized {
		c.invalidateToken()
		return c.GetCategoryPlaylists(ctx, categoryID, limit)
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("Spotify GetCategoryPlaylists trả về HTTP %d", res.StatusCode)
	}
	var payload struct {
		Playlists struct {
			Items []struct {
				ID          string `json:"id"`
				Name        string `json:"name"`
				Description string `json:"description"`
				Images      []struct {
					URL string `json:"url"`
				} `json:"images"`
				Owner struct {
					ID          string `json:"id"`
					DisplayName string `json:"display_name"`
				} `json:"owner"`
				Tracks struct {
					Total int `json:"total"`
				} `json:"tracks"`
				ExternalURLs struct {
					Spotify string `json:"spotify"`
				} `json:"external_urls"`
			} `json:"items"`
		} `json:"playlists"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&payload); err != nil {
		return nil, err
	}
	result := make([]CollectionSummary, 0, len(payload.Playlists.Items))
	for _, item := range payload.Playlists.Items {
		if item.ID == "" {
			continue
		}
		images := make([]string, 0, len(item.Images))
		for _, img := range item.Images {
			if img.URL != "" {
				images = append(images, img.URL)
			}
		}
		result = append(result, CollectionSummary{
			ID:          item.ID,
			Name:        item.Name,
			Description: item.Description,
			Type:        "playlist",
			Images:      images,
			Owner:       Artist{ID: item.Owner.ID, Name: item.Owner.DisplayName},
			TotalItems:  item.Tracks.Total,
			ExternalURL: item.ExternalURLs.Spotify,
		})
	}
	return result, nil
}

func (c *Client) token(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.accessToken != "" && time.Now().Before(c.tokenExpiry) {
		return c.accessToken, nil
	}

	form := url.Values{"grant_type": {"client_credentials"}}
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.tokenURL,
		strings.NewReader(form.Encode()),
	)
	if err != nil {
		return "", err
	}
	credentials := base64.StdEncoding.EncodeToString([]byte(c.clientID + ":" + c.clientSecret))
	req.Header.Set("Authorization", "Basic "+credentials)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return "", fmt.Errorf("Spotify token trả về HTTP %d", res.StatusCode)
	}
	var payload struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&payload); err != nil {
		return "", err
	}
	if payload.AccessToken == "" {
		return "", errors.New("Spotify không trả về access token")
	}
	expiresIn := time.Duration(payload.ExpiresIn) * time.Second
	if expiresIn <= 0 {
		expiresIn = time.Hour
	}
	c.accessToken = payload.AccessToken
	c.tokenExpiry = time.Now().Add(expiresIn - min(expiresIn/10, time.Minute))
	return c.accessToken, nil
}

func (c *Client) invalidateToken() {
	c.mu.Lock()
	c.accessToken = ""
	c.tokenExpiry = time.Time{}
	c.mu.Unlock()
}

func (c *Client) authorizedToken(ctx context.Context) (string, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return "", ErrNotConfigured
	}
	return c.token(ctx)
}

func clampSearchLimit(limit int) int {
	if limit < 1 {
		return 10
	}
	return min(limit, 10)
}

func clampDiscoveryLimit(limit int) int {
	if limit < 1 {
		return 16
	}
	return min(limit, 40)
}

func normalizeGenre(genre string) string {
	genre = strings.TrimSpace(genre)
	if genre == "" || strings.EqualFold(genre, "all") {
		return ""
	}
	aliases := map[string]string{
		"Hip-Hop/Rap": "hip-hop",
		"R&B/Soul":    "r-n-b",
		"Drum & Bass": "drum-and-bass",
		"Spoken Word": "spoken-word",
	}
	if normalized, ok := aliases[genre]; ok {
		return normalized
	}
	return strings.ToLower(genre)
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		key := strings.ToLower(value)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, value)
	}
	return result
}

func (c *Client) search(
	ctx context.Context,
	token, query string,
	limit, offset int,
) ([]Track, int, error) {
	params := url.Values{
		"q":      {query},
		"type":   {"track"},
		"market": {c.market},
		"limit":  {strconv.Itoa(limit)},
		"offset": {strconv.Itoa(offset)},
	}
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		c.apiURL+"/search?"+params.Encode(),
		nil,
	)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	res, err := c.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, res.StatusCode, fmt.Errorf("Spotify Search trả về HTTP %d", res.StatusCode)
	}
	var payload struct {
		Tracks struct {
			Items []struct {
				ID         string `json:"id"`
				Name       string `json:"name"`
				DurationMS int    `json:"duration_ms"`
				Artists    []struct {
					ID   string `json:"id"`
					Name string `json:"name"`
				} `json:"artists"`
				Album struct {
					ID          string `json:"id"`
					Name        string `json:"name"`
					ReleaseDate string `json:"release_date"`
					Images      []struct {
						URL    string `json:"url"`
						Width  int    `json:"width"`
						Height int    `json:"height"`
					} `json:"images"`
				} `json:"album"`
				ExternalURLs struct {
					Spotify string `json:"spotify"`
				} `json:"external_urls"`
			} `json:"items"`
		} `json:"tracks"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&payload); err != nil {
		return nil, res.StatusCode, err
	}

	tracks := make([]Track, 0, len(payload.Tracks.Items))
	for _, item := range payload.Tracks.Items {
		if item.ID == "" || item.Name == "" || len(item.Artists) == 0 {
			continue
		}
		artwork := Artwork{}
		for _, image := range item.Album.Images {
			switch {
			case image.Width >= 640 && artwork.Large == "":
				artwork.Large = image.URL
			case image.Width >= 300 && artwork.Medium == "":
				artwork.Medium = image.URL
			case artwork.Small == "":
				artwork.Small = image.URL
			}
		}
		if artwork.Medium == "" {
			artwork.Medium = firstNonEmpty(artwork.Large, artwork.Small)
		}
		artists := make([]Artist, 0, len(item.Artists))
		for _, a := range item.Artists {
			if a.ID != "" && a.Name != "" {
				artists = append(artists, Artist{ID: a.ID, Name: a.Name})
			}
		}
		tracks = append(tracks, Track{
			ID:          item.ID,
			Provider:    "spotify",
			Title:       item.Name,
			Duration:    item.DurationMS / 1000,
			CreatedAt:   item.Album.ReleaseDate,
			User:        Artist{ID: item.Artists[0].ID, Name: joinArtistNames(item.Artists)},
			Artists:     artists,
			Artwork:     artwork,
			Album:       AlbumInfo{ID: item.Album.ID, Name: item.Album.Name},
			ExternalURL: item.ExternalURLs.Spotify,
		})
	}
	return tracks, res.StatusCode, nil
}

func (c *Client) searchArtists(
	ctx context.Context,
	token, query string,
	limit int,
) ([]ArtistSummary, int, error) {
	params := url.Values{
		"q":      {query},
		"type":   {"artist"},
		"market": {c.market},
		"limit":  {strconv.Itoa(limit)},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.apiURL+"/search?"+params.Encode(), nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := c.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, res.StatusCode, fmt.Errorf("Spotify Artist Search trả về HTTP %d", res.StatusCode)
	}
	var payload struct {
		Artists struct {
			Items []struct {
				ID     string `json:"id"`
				Name   string `json:"name"`
				Images []struct {
					URL string `json:"url"`
				} `json:"images"`
				ExternalURLs struct {
					Spotify string `json:"spotify"`
				} `json:"external_urls"`
			} `json:"items"`
		} `json:"artists"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&payload); err != nil {
		return nil, res.StatusCode, err
	}
	items := make([]ArtistSummary, 0, len(payload.Artists.Items))
	for _, item := range payload.Artists.Items {
		if item.ID == "" || item.Name == "" {
			continue
		}
		images := make([]string, 0, len(item.Images))
		for _, image := range item.Images {
			if image.URL != "" {
				images = append(images, image.URL)
			}
		}
		items = append(items, ArtistSummary{
			ID:          item.ID,
			Name:        item.Name,
			Images:      images,
			ExternalURL: item.ExternalURLs.Spotify,
		})
	}
	return items, res.StatusCode, nil
}

func (c *Client) searchCollections(
	ctx context.Context,
	token, query, itemType string,
	limit int,
) ([]CollectionSummary, int, error) {
	params := url.Values{
		"q":      {query},
		"type":   {itemType},
		"market": {c.market},
		"limit":  {strconv.Itoa(limit)},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.apiURL+"/search?"+params.Encode(), nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := c.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, res.StatusCode, fmt.Errorf("Spotify %s Search trả về HTTP %d", itemType, res.StatusCode)
	}
	var payload struct {
		Albums struct {
			Items []struct {
				ID          string `json:"id"`
				Name        string `json:"name"`
				ReleaseDate string `json:"release_date"`
				TotalTracks int    `json:"total_tracks"`
				Artists     []struct {
					ID   string `json:"id"`
					Name string `json:"name"`
				} `json:"artists"`
				Images []struct {
					URL string `json:"url"`
				} `json:"images"`
				ExternalURLs struct {
					Spotify string `json:"spotify"`
				} `json:"external_urls"`
			} `json:"items"`
		} `json:"albums"`
		Playlists struct {
			Items []*struct {
				ID          string `json:"id"`
				Name        string `json:"name"`
				Description string `json:"description"`
				Owner       struct {
					ID          string `json:"id"`
					DisplayName string `json:"display_name"`
				} `json:"owner"`
				Images []struct {
					URL string `json:"url"`
				} `json:"images"`
				Items struct {
					Total int `json:"total"`
				} `json:"items"`
				Tracks struct {
					Total int `json:"total"`
				} `json:"tracks"`
				ExternalURLs struct {
					Spotify string `json:"spotify"`
				} `json:"external_urls"`
			} `json:"items"`
		} `json:"playlists"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 3<<20)).Decode(&payload); err != nil {
		return nil, res.StatusCode, err
	}

	items := make([]CollectionSummary, 0, limit)
	if itemType == "album" {
		for _, item := range payload.Albums.Items {
			if item.ID == "" || item.Name == "" {
				continue
			}
			images := imageURLs(item.Images)
			owner := Artist{}
			if len(item.Artists) > 0 {
				owner = Artist{ID: item.Artists[0].ID, Name: joinArtistNames(item.Artists)}
			}
			items = append(items, CollectionSummary{
				ID:          item.ID,
				Name:        item.Name,
				Type:        "album",
				Images:      images,
				Owner:       owner,
				TotalItems:  item.TotalTracks,
				ReleaseDate: item.ReleaseDate,
				ExternalURL: item.ExternalURLs.Spotify,
			})
		}
		return items, res.StatusCode, nil
	}

	for _, item := range payload.Playlists.Items {
		if item == nil || item.ID == "" || item.Name == "" {
			continue
		}
		total := item.Items.Total
		if total == 0 {
			total = item.Tracks.Total
		}
		items = append(items, CollectionSummary{
			ID:          item.ID,
			Name:        item.Name,
			Description: item.Description,
			Type:        "playlist",
			Images:      imageURLs(item.Images),
			Owner:       Artist{ID: item.Owner.ID, Name: firstNonEmpty(item.Owner.DisplayName, "Spotify")},
			TotalItems:  total,
			ExternalURL: item.ExternalURLs.Spotify,
		})
	}
	return items, res.StatusCode, nil
}

func imageURLs(images []struct {
	URL string `json:"url"`
}) []string {
	result := make([]string, 0, len(images))
	for _, image := range images {
		if image.URL != "" {
			result = append(result, image.URL)
		}
	}
	return result
}

// RecommendParams holds seed identifiers for the Spotify recommendations endpoint.
type RecommendParams struct {
	SeedTrackIDs  []string // Spotify track IDs (max 5 combined with artists+genres)
	SeedArtistIDs []string
	SeedGenres    []string
	Limit         int
}

// GetRecommendations calls the Spotify /recommendations endpoint.
// Returns at most params.Limit tracks based on the provided seeds.
func (c *Client) GetRecommendations(ctx context.Context, params RecommendParams) ([]Track, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return nil, ErrNotConfigured
	}

	limit := params.Limit
	if limit < 1 {
		limit = 12
	}
	if limit > 100 {
		limit = 100
	}

	token, err := c.token(ctx)
	if err != nil {
		return nil, err
	}

	tracks, status, err := c.recommend(ctx, token, params, limit)
	if err == nil || status != http.StatusUnauthorized {
		return tracks, err
	}
	// Retry once after token refresh
	c.invalidateToken()
	token, err = c.token(ctx)
	if err != nil {
		return nil, err
	}
	tracks, _, err = c.recommend(ctx, token, params, limit)
	return tracks, err
}

func (c *Client) recommend(
	ctx context.Context,
	token string,
	params RecommendParams,
	limit int,
) ([]Track, int, error) {
	query := url.Values{
		"limit":  {strconv.Itoa(limit)},
		"market": {c.market},
	}
	if len(params.SeedTrackIDs) > 0 {
		query.Set("seed_tracks", strings.Join(params.SeedTrackIDs, ","))
	}
	if len(params.SeedArtistIDs) > 0 {
		query.Set("seed_artists", strings.Join(params.SeedArtistIDs, ","))
	}
	if len(params.SeedGenres) > 0 {
		query.Set("seed_genres", strings.Join(params.SeedGenres, ","))
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.apiURL+"/recommendations?"+query.Encode(), nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	res, err := c.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, res.StatusCode, fmt.Errorf("Spotify Recommendations trả về HTTP %d", res.StatusCode)
	}

	var payload struct {
		Tracks []struct {
			ID         string `json:"id"`
			Name       string `json:"name"`
			DurationMS int    `json:"duration_ms"`
			Artists    []struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"artists"`
			Album struct {
				ID          string `json:"id"`
				Name        string `json:"name"`
				ReleaseDate string `json:"release_date"`
				Images      []struct {
					URL    string `json:"url"`
					Width  int    `json:"width"`
					Height int    `json:"height"`
				} `json:"images"`
			} `json:"album"`
			ExternalURLs struct {
				Spotify string `json:"spotify"`
			} `json:"external_urls"`
		} `json:"tracks"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&payload); err != nil {
		return nil, res.StatusCode, err
	}

	tracks := make([]Track, 0, len(payload.Tracks))
	for _, item := range payload.Tracks {
		if item.ID == "" || item.Name == "" || len(item.Artists) == 0 {
			continue
		}
		artwork := Artwork{}
		for _, image := range item.Album.Images {
			switch {
			case image.Width >= 640 && artwork.Large == "":
				artwork.Large = image.URL
			case image.Width >= 300 && artwork.Medium == "":
				artwork.Medium = image.URL
			case artwork.Small == "":
				artwork.Small = image.URL
			}
		}
		if artwork.Medium == "" {
			artwork.Medium = firstNonEmpty(artwork.Large, artwork.Small)
		}
		artists := make([]Artist, 0, len(item.Artists))
		for _, a := range item.Artists {
			if a.ID != "" && a.Name != "" {
				artists = append(artists, Artist{ID: a.ID, Name: a.Name})
			}
		}
		tracks = append(tracks, Track{
			ID:          item.ID,
			Provider:    "spotify",
			Title:       item.Name,
			Duration:    item.DurationMS / 1000,
			CreatedAt:   item.Album.ReleaseDate,
			User:        Artist{ID: item.Artists[0].ID, Name: joinArtistNames(item.Artists)},
			Artists:     artists,
			Artwork:     artwork,
			Album:       AlbumInfo{ID: item.Album.ID, Name: item.Album.Name},
			ExternalURL: item.ExternalURLs.Spotify,
		})
	}
	return tracks, res.StatusCode, nil
}

// GetTrack fetches a single Spotify track by its ID.
func (c *Client) GetTrack(ctx context.Context, trackID string) (*Track, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return nil, ErrNotConfigured
	}
	token, err := c.token(ctx)
	if err != nil {
		return nil, err
	}
	track, status, err := c.fetchTrack(ctx, token, trackID)
	if err == nil || status != http.StatusUnauthorized {
		return track, err
	}
	c.invalidateToken()
	token, err = c.token(ctx)
	if err != nil {
		return nil, err
	}
	track, _, err = c.fetchTrack(ctx, token, trackID)
	return track, err
}

func (c *Client) fetchTrack(ctx context.Context, token, trackID string) (*Track, int, error) {
	params := url.Values{"market": {c.market}}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.apiURL+"/tracks/"+trackID+"?"+params.Encode(), nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	res, err := c.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, res.StatusCode, fmt.Errorf("Spotify GetTrack trả về HTTP %d", res.StatusCode)
	}

	var item struct {
		ID         string `json:"id"`
		Name       string `json:"name"`
		DurationMS int    `json:"duration_ms"`
		Artists    []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"artists"`
		Album struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			ReleaseDate string `json:"release_date"`
			Images      []struct {
				URL    string `json:"url"`
				Width  int    `json:"width"`
				Height int    `json:"height"`
			} `json:"images"`
		} `json:"album"`
		ExternalURLs struct {
			Spotify string `json:"spotify"`
		} `json:"external_urls"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&item); err != nil {
		return nil, res.StatusCode, err
	}
	if item.ID == "" || item.Name == "" || len(item.Artists) == 0 {
		return nil, res.StatusCode, fmt.Errorf("track không hợp lệ")
	}

	artwork := Artwork{}
	for _, image := range item.Album.Images {
		switch {
		case image.Width >= 640 && artwork.Large == "":
			artwork.Large = image.URL
		case image.Width >= 300 && artwork.Medium == "":
			artwork.Medium = image.URL
		case artwork.Small == "":
			artwork.Small = image.URL
		}
	}
	if artwork.Medium == "" {
		artwork.Medium = firstNonEmpty(artwork.Large, artwork.Small)
	}
	artists := make([]Artist, 0, len(item.Artists))
	for _, a := range item.Artists {
		if a.ID != "" && a.Name != "" {
			artists = append(artists, Artist{ID: a.ID, Name: a.Name})
		}
	}
	t := &Track{
		ID:          item.ID,
		Provider:    "spotify",
		Title:       item.Name,
		Duration:    item.DurationMS / 1000,
		CreatedAt:   item.Album.ReleaseDate,
		User:        Artist{ID: item.Artists[0].ID, Name: joinArtistNames(item.Artists)},
		Artists:     artists,
		Artwork:     artwork,
		Album:       AlbumInfo{ID: item.Album.ID, Name: item.Album.Name},
		ExternalURL: item.ExternalURLs.Spotify,
	}
	return t, res.StatusCode, nil
}

// ArtistDetail holds Spotify artist profile data.
type ArtistDetail struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Genres      []string `json:"genres"`
	Popularity  int      `json:"popularity"`
	Followers   int      `json:"followers"`
	Images      []string `json:"images"`
	ExternalURL string   `json:"external_url"`
}

// AlbumDetail holds full Spotify album data including tracks.
type AlbumDetail struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	AlbumType   string   `json:"album_type"`
	ReleaseDate string   `json:"release_date"`
	TotalTracks int      `json:"total_tracks"`
	Images      []string `json:"images"`
	ArtistID    string   `json:"artist_id"`
	ArtistName  string   `json:"artist_name"`
	ExternalURL string   `json:"external_url"`
	Label       string   `json:"label,omitempty"`
	Tracks      []Track  `json:"tracks"`
}

// AlbumSummary is a lightweight album card returned in artist discography/appearing-on lists.
type AlbumSummary struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	AlbumType   string   `json:"album_type"`
	ReleaseDate string   `json:"release_date"`
	Images      []string `json:"images"`
	ArtistName  string   `json:"artist_name"`
	ExternalURL string   `json:"external_url"`
}

// GetArtist fetches a Spotify artist profile by ID.
func (c *Client) GetArtist(ctx context.Context, artistID string) (*ArtistDetail, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return nil, ErrNotConfigured
	}
	token, err := c.token(ctx)
	if err != nil {
		return nil, err
	}
	detail, status, err := c.fetchArtist(ctx, token, artistID)
	if err == nil || status != http.StatusUnauthorized {
		return detail, err
	}
	c.invalidateToken()
	token, err = c.token(ctx)
	if err != nil {
		return nil, err
	}
	detail, _, err = c.fetchArtist(ctx, token, artistID)
	return detail, err
}

func (c *Client) fetchArtist(ctx context.Context, token, artistID string) (*ArtistDetail, int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.apiURL+"/artists/"+artistID, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := c.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, res.StatusCode, fmt.Errorf("Spotify GetArtist trả về HTTP %d", res.StatusCode)
	}
	var item struct {
		ID         string   `json:"id"`
		Name       string   `json:"name"`
		Genres     []string `json:"genres"`
		Popularity int      `json:"popularity"`
		Followers  struct {
			Total int `json:"total"`
		} `json:"followers"`
		Images []struct {
			URL string `json:"url"`
		} `json:"images"`
		ExternalURLs struct {
			Spotify string `json:"spotify"`
		} `json:"external_urls"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&item); err != nil {
		return nil, res.StatusCode, err
	}
	images := make([]string, 0, len(item.Images))
	for _, img := range item.Images {
		if img.URL != "" {
			images = append(images, img.URL)
		}
	}
	genres := item.Genres
	if genres == nil {
		genres = []string{}
	}
	return &ArtistDetail{
		ID:          item.ID,
		Name:        item.Name,
		Genres:      genres,
		Popularity:  item.Popularity,
		Followers:   item.Followers.Total,
		Images:      images,
		ExternalURL: item.ExternalURLs.Spotify,
	}, res.StatusCode, nil
}

// GetArtistTopTracks builds a ten-track popular set using the supported Search API.
// Spotify removed /artists/{id}/top-tracks from Development Mode in February 2026.
func (c *Client) GetArtistTopTracks(ctx context.Context, artistID string, artistName string) ([]Track, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return nil, ErrNotConfigured
	}
	token, err := c.token(ctx)
	if err != nil {
		return nil, err
	}
	if artistName != "" {
		searched, _, searchErr := c.search(ctx, token, fmt.Sprintf(`artist:"%s"`, artistName), 10, 0)
		if searchErr == nil && len(searched) > 0 {
			return searched[:min(10, len(searched))], nil
		}
	}

	// Fallback for sparse search results: aggregate tracks from latest releases.
	albums, _, _, aerr := c.fetchArtistAlbums(ctx, token, artistID, "album,single", 2, 0)
	if aerr == nil && len(albums) > 0 {
		var aggregated []Track
		seen := make(map[string]bool)
		for _, alb := range albums {
			album, _, ferr := c.fetchAlbum(ctx, token, alb.ID)
			if ferr != nil || album == nil {
				continue
			}
			for _, t := range album.Tracks {
				if !seen[t.ID] {
					seen[t.ID] = true
					aggregated = append(aggregated, t)
				}
				if len(aggregated) >= 10 {
					break
				}
			}
			if len(aggregated) >= 10 {
				break
			}
		}
		if len(aggregated) > 0 {
			return aggregated, nil
		}
	}
	return []Track{}, nil
}

func (c *Client) fetchArtistTopTracks(ctx context.Context, token, artistID string) ([]Track, int, error) {
	params := url.Values{"market": {c.market}}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.apiURL+"/artists/"+artistID+"/top-tracks?"+params.Encode(), nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := c.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, res.StatusCode, fmt.Errorf("Spotify ArtistTopTracks trả về HTTP %d", res.StatusCode)
	}
	var payload struct {
		Tracks []struct {
			ID         string `json:"id"`
			Name       string `json:"name"`
			DurationMS int    `json:"duration_ms"`
			Artists    []struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"artists"`
			Album struct {
				ID          string `json:"id"`
				Name        string `json:"name"`
				ReleaseDate string `json:"release_date"`
				Images      []struct {
					URL    string `json:"url"`
					Width  int    `json:"width"`
					Height int    `json:"height"`
				} `json:"images"`
			} `json:"album"`
			ExternalURLs struct {
				Spotify string `json:"spotify"`
			} `json:"external_urls"`
		} `json:"tracks"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&payload); err != nil {
		return nil, res.StatusCode, err
	}
	tracks := make([]Track, 0, len(payload.Tracks))
	for _, item := range payload.Tracks {
		if item.ID == "" || item.Name == "" || len(item.Artists) == 0 {
			continue
		}
		artwork := Artwork{}
		for _, image := range item.Album.Images {
			switch {
			case image.Width >= 640 && artwork.Large == "":
				artwork.Large = image.URL
			case image.Width >= 300 && artwork.Medium == "":
				artwork.Medium = image.URL
			case artwork.Small == "":
				artwork.Small = image.URL
			}
		}
		if artwork.Medium == "" {
			artwork.Medium = firstNonEmpty(artwork.Large, artwork.Small)
		}
		artists := make([]Artist, 0, len(item.Artists))
		for _, a := range item.Artists {
			if a.ID != "" && a.Name != "" {
				artists = append(artists, Artist{ID: a.ID, Name: a.Name})
			}
		}
		tracks = append(tracks, Track{
			ID:          item.ID,
			Provider:    "spotify",
			Title:       item.Name,
			Duration:    item.DurationMS / 1000,
			CreatedAt:   item.Album.ReleaseDate,
			User:        Artist{ID: item.Artists[0].ID, Name: joinArtistNames(item.Artists)},
			Artists:     artists,
			Artwork:     artwork,
			Album:       AlbumInfo{ID: item.Album.ID, Name: item.Album.Name},
			ExternalURL: item.ExternalURLs.Spotify,
		})
	}
	return tracks, res.StatusCode, nil
}

// GetAlbum fetches full album detail including track list.
func (c *Client) GetAlbum(ctx context.Context, albumID string) (*AlbumDetail, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return nil, ErrNotConfigured
	}
	token, err := c.token(ctx)
	if err != nil {
		return nil, err
	}
	album, status, err := c.fetchAlbum(ctx, token, albumID)
	if err != nil && status == http.StatusUnauthorized {
		c.invalidateToken()
		token, err = c.token(ctx)
		if err != nil {
			return nil, err
		}
		album, _, err = c.fetchAlbum(ctx, token, albumID)
	}
	return album, err
}

func (c *Client) fetchAlbum(ctx context.Context, token, albumID string) (*AlbumDetail, int, error) {
	params := url.Values{"market": {c.market}}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.apiURL+"/albums/"+albumID+"?"+params.Encode(), nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := c.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, res.StatusCode, fmt.Errorf("Spotify GetAlbum trả về HTTP %d", res.StatusCode)
	}
	var item struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		AlbumType   string `json:"album_type"`
		ReleaseDate string `json:"release_date"`
		TotalTracks int    `json:"total_tracks"`
		Label       string `json:"label"`
		Artists     []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"artists"`
		Images []struct {
			URL   string `json:"url"`
			Width int    `json:"width"`
		} `json:"images"`
		ExternalURLs struct {
			Spotify string `json:"spotify"`
		} `json:"external_urls"`
		Tracks struct {
			Items []struct {
				ID          string `json:"id"`
				Name        string `json:"name"`
				DurationMS  int    `json:"duration_ms"`
				TrackNumber int    `json:"track_number"`
				Artists     []struct {
					ID   string `json:"id"`
					Name string `json:"name"`
				} `json:"artists"`
				ExternalURLs struct {
					Spotify string `json:"spotify"`
				} `json:"external_urls"`
			} `json:"items"`
		} `json:"tracks"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 4<<20)).Decode(&item); err != nil {
		return nil, res.StatusCode, err
	}

	images := make([]string, 0, len(item.Images))
	for _, img := range item.Images {
		if img.URL != "" {
			images = append(images, img.URL)
		}
	}

	artistID, artistName := "", ""
	if len(item.Artists) > 0 {
		artistID = item.Artists[0].ID
		names := make([]string, 0, len(item.Artists))
		for _, a := range item.Artists {
			if a.Name != "" {
				names = append(names, a.Name)
			}
		}
		artistName = strings.Join(names, ", ")
	}

	tracks := make([]Track, 0, len(item.Tracks.Items))
	for _, t := range item.Tracks.Items {
		if t.ID == "" || t.Name == "" || len(t.Artists) == 0 {
			continue
		}
		// Album tracks don't carry their own artwork; use album images
		artwork := Artwork{}
		for _, img := range item.Images {
			switch {
			case img.Width >= 640 && artwork.Large == "":
				artwork.Large = img.URL
			case img.Width >= 300 && artwork.Medium == "":
				artwork.Medium = img.URL
			case artwork.Small == "":
				artwork.Small = img.URL
			}
		}
		if artwork.Medium == "" {
			artwork.Medium = firstNonEmpty(artwork.Large, artwork.Small)
		}
		tArtists := make([]Artist, 0, len(t.Artists))
		for _, a := range t.Artists {
			if a.ID != "" && a.Name != "" {
				tArtists = append(tArtists, Artist{ID: a.ID, Name: a.Name})
			}
		}
		tracks = append(tracks, Track{
			ID:          t.ID,
			Provider:    "spotify",
			Title:       t.Name,
			Duration:    t.DurationMS / 1000,
			CreatedAt:   item.ReleaseDate,
			User:        Artist{ID: t.Artists[0].ID, Name: joinArtistNames(t.Artists)},
			Artists:     tArtists,
			Artwork:     artwork,
			Album:       AlbumInfo{ID: item.ID, Name: item.Name},
			ExternalURL: t.ExternalURLs.Spotify,
		})
	}

	return &AlbumDetail{
		ID:          item.ID,
		Name:        item.Name,
		AlbumType:   item.AlbumType,
		ReleaseDate: item.ReleaseDate,
		TotalTracks: item.TotalTracks,
		Images:      images,
		ArtistID:    artistID,
		ArtistName:  artistName,
		ExternalURL: item.ExternalURLs.Spotify,
		Label:       item.Label,
		Tracks:      tracks,
	}, res.StatusCode, nil
}

// GetAlbumTracks returns paginated tracks for a Spotify album.
func (c *Client) GetAlbumTracks(ctx context.Context, albumID string, limit, offset int) ([]Track, int, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return nil, 0, ErrNotConfigured
	}
	if limit < 1 || limit > 50 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	token, err := c.token(ctx)
	if err != nil {
		return nil, 0, err
	}
	tracks, total, status, err := c.fetchAlbumTracks(ctx, token, albumID, limit, offset)
	if err != nil && status == http.StatusUnauthorized {
		c.invalidateToken()
		token, err = c.token(ctx)
		if err != nil {
			return nil, 0, err
		}
		tracks, total, _, err = c.fetchAlbumTracks(ctx, token, albumID, limit, offset)
	}
	return tracks, total, err
}

func (c *Client) fetchAlbumTracks(ctx context.Context, token, albumID string, limit, offset int) ([]Track, int, int, error) {
	params := url.Values{
		"market": {c.market},
		"limit":  {strconv.Itoa(limit)},
		"offset": {strconv.Itoa(offset)},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.apiURL+"/albums/"+albumID+"/tracks?"+params.Encode(), nil)
	if err != nil {
		return nil, 0, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := c.client.Do(req)
	if err != nil {
		return nil, 0, 0, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, 0, res.StatusCode, fmt.Errorf("Spotify AlbumTracks trả về HTTP %d", res.StatusCode)
	}
	var payload struct {
		Total int `json:"total"`
		Items []struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			DurationMS  int    `json:"duration_ms"`
			TrackNumber int    `json:"track_number"`
			Artists     []struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"artists"`
			ExternalURLs struct {
				Spotify string `json:"spotify"`
			} `json:"external_urls"`
		} `json:"items"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&payload); err != nil {
		return nil, 0, res.StatusCode, err
	}
	tracks := make([]Track, 0, len(payload.Items))
	for _, t := range payload.Items {
		if t.ID == "" || t.Name == "" || len(t.Artists) == 0 {
			continue
		}
		tArtists := make([]Artist, 0, len(t.Artists))
		for _, a := range t.Artists {
			if a.ID != "" && a.Name != "" {
				tArtists = append(tArtists, Artist{ID: a.ID, Name: a.Name})
			}
		}
		tracks = append(tracks, Track{
			ID:          t.ID,
			Provider:    "spotify",
			Title:       t.Name,
			Duration:    t.DurationMS / 1000,
			User:        Artist{ID: t.Artists[0].ID, Name: joinArtistNames(t.Artists)},
			Artists:     tArtists,
			Album:       AlbumInfo{ID: albumID},
			ExternalURL: t.ExternalURLs.Spotify,
		})
	}
	return tracks, payload.Total, res.StatusCode, nil
}

// GetArtistAlbums returns the artist's own albums and singles.
func (c *Client) GetArtistAlbums(ctx context.Context, artistID string, limit, offset int) ([]AlbumSummary, int, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return nil, 0, ErrNotConfigured
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}
	token, err := c.token(ctx)
	if err != nil {
		return nil, 0, err
	}
	albums, total, status, err := c.fetchArtistAlbums(ctx, token, artistID, "album,single", limit, offset)
	if err != nil && status == http.StatusUnauthorized {
		c.invalidateToken()
		token, err = c.token(ctx)
		if err != nil {
			return nil, 0, err
		}
		albums, total, _, err = c.fetchArtistAlbums(ctx, token, artistID, "album,single", limit, offset)
	}
	return albums, total, err
}

// GetArtistAppearsOn returns albums where the artist is featured.
func (c *Client) GetArtistAppearsOn(ctx context.Context, artistID string, limit, offset int) ([]AlbumSummary, int, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return nil, 0, ErrNotConfigured
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}
	token, err := c.token(ctx)
	if err != nil {
		return nil, 0, err
	}
	albums, total, status, err := c.fetchArtistAlbums(ctx, token, artistID, "appears_on", limit, offset)
	if err != nil && status == http.StatusUnauthorized {
		c.invalidateToken()
		token, err = c.token(ctx)
		if err != nil {
			return nil, 0, err
		}
		albums, total, _, err = c.fetchArtistAlbums(ctx, token, artistID, "appears_on", limit, offset)
	}
	return albums, total, err
}

func (c *Client) fetchArtistAlbums(ctx context.Context, token, artistID, includeGroups string, limit, offset int) ([]AlbumSummary, int, int, error) {
	if limit > 20 {
		limit = 20
	}
	params := url.Values{
		"include_groups": {includeGroups},
		"limit":          {strconv.Itoa(limit)},
		"offset":         {strconv.Itoa(offset)},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.apiURL+"/artists/"+artistID+"/albums?"+params.Encode(), nil)
	if err != nil {
		return nil, 0, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := c.client.Do(req)
	if err != nil {
		return nil, 0, 0, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		body, _ := io.ReadAll(res.Body)
		return nil, 0, res.StatusCode, fmt.Errorf("Spotify ArtistAlbums trả về HTTP %d: %s", res.StatusCode, string(body))
	}
	var payload struct {
		Total int `json:"total"`
		Items []struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			AlbumType   string `json:"album_type"`
			ReleaseDate string `json:"release_date"`
			Artists     []struct {
				Name string `json:"name"`
			} `json:"artists"`
			Images []struct {
				URL   string `json:"url"`
				Width int    `json:"width"`
			} `json:"images"`
			ExternalURLs struct {
				Spotify string `json:"spotify"`
			} `json:"external_urls"`
		} `json:"items"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&payload); err != nil {
		return nil, 0, res.StatusCode, err
	}
	albums := make([]AlbumSummary, 0, len(payload.Items))
	for _, item := range payload.Items {
		if item.ID == "" || item.Name == "" {
			continue
		}
		var thumb string
		for _, img := range item.Images {
			if img.Width >= 300 {
				thumb = img.URL
				break
			}
		}
		if thumb == "" && len(item.Images) > 0 {
			thumb = item.Images[0].URL
		}
		artistName := ""
		if len(item.Artists) > 0 {
			artistName = item.Artists[0].Name
		}
		albums = append(albums, AlbumSummary{
			ID:          item.ID,
			Name:        item.Name,
			AlbumType:   item.AlbumType,
			ReleaseDate: item.ReleaseDate,
			Images:      []string{thumb},
			ArtistName:  artistName,
			ExternalURL: item.ExternalURLs.Spotify,
		})
	}
	return albums, payload.Total, res.StatusCode, nil
}

func joinArtistNames(artists []struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}) string {
	names := make([]string, 0, len(artists))
	for _, artist := range artists {
		if strings.TrimSpace(artist.Name) != "" {
			names = append(names, artist.Name)
		}
	}
	return strings.Join(names, ", ")
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

// GetPlaylist fetches Spotify playlist metadata.
func (c *Client) GetPlaylist(ctx context.Context, playlistID string) (*CollectionSummary, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return nil, ErrNotConfigured
	}
	token, err := c.token(ctx)
	if err != nil {
		return nil, err
	}
	result, status, err := c.fetchPlaylist(ctx, token, playlistID)
	if err != nil && status == http.StatusUnauthorized {
		c.invalidateToken()
		token, err = c.token(ctx)
		if err != nil {
			return nil, err
		}
		result, _, err = c.fetchPlaylist(ctx, token, playlistID)
	}
	return result, err
}

func (c *Client) fetchPlaylist(ctx context.Context, token, playlistID string) (*CollectionSummary, int, error) {
	params := url.Values{"fields": {"id,name,description,images,owner,tracks.total,external_urls"}, "market": {c.market}}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.apiURL+"/playlists/"+playlistID+"?"+params.Encode(), nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := c.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, res.StatusCode, fmt.Errorf("Spotify GetPlaylist trả về HTTP %d", res.StatusCode)
	}
	var item struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Type        string `json:"type"`
		Images      []struct {
			URL string `json:"url"`
		} `json:"images"`
		Owner struct {
			ID          string `json:"id"`
			DisplayName string `json:"display_name"`
		} `json:"owner"`
		Tracks struct {
			Total int `json:"total"`
		} `json:"tracks"`
		ExternalURLs struct {
			Spotify string `json:"spotify"`
		} `json:"external_urls"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&item); err != nil {
		return nil, res.StatusCode, err
	}
	images := make([]string, 0, len(item.Images))
	for _, img := range item.Images {
		if img.URL != "" {
			images = append(images, img.URL)
		}
	}
	return &CollectionSummary{
		ID:          item.ID,
		Name:        item.Name,
		Description: item.Description,
		Type:        "playlist",
		Images:      images,
		Owner:       Artist{ID: item.Owner.ID, Name: item.Owner.DisplayName},
		TotalItems:  item.Tracks.Total,
		ExternalURL: item.ExternalURLs.Spotify,
	}, res.StatusCode, nil
}

// GetPlaylistTracks returns paginated tracks for a Spotify playlist.
func (c *Client) GetPlaylistTracks(ctx context.Context, playlistID string, limit, offset int) ([]Track, int, error) {
	if c.clientID == "" || c.clientSecret == "" {
		return nil, 0, ErrNotConfigured
	}
	if limit < 1 || limit > 50 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	token, err := c.token(ctx)
	if err != nil {
		return nil, 0, err
	}
	tracks, total, status, err := c.fetchPlaylistTracks(ctx, token, playlistID, limit, offset)
	if err != nil && status == http.StatusUnauthorized {
		c.invalidateToken()
		token, err = c.token(ctx)
		if err != nil {
			return nil, 0, err
		}
		tracks, total, _, err = c.fetchPlaylistTracks(ctx, token, playlistID, limit, offset)
	}
	return tracks, total, err
}

func (c *Client) fetchPlaylistTracks(ctx context.Context, token, playlistID string, limit, offset int) ([]Track, int, int, error) {
	params := url.Values{
		"market": {c.market},
		"limit":  {strconv.Itoa(limit)},
		"offset": {strconv.Itoa(offset)},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.apiURL+"/playlists/"+playlistID+"/tracks?"+params.Encode(), nil)
	if err != nil {
		return nil, 0, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := c.client.Do(req)
	if err != nil {
		return nil, 0, 0, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, 0, res.StatusCode, fmt.Errorf("Spotify PlaylistTracks trả về HTTP %d", res.StatusCode)
	}
	var payload struct {
		Total int `json:"total"`
		Items []struct {
			Track *struct {
				ID         string `json:"id"`
				Name       string `json:"name"`
				DurationMS int    `json:"duration_ms"`
				Artists    []struct {
					ID   string `json:"id"`
					Name string `json:"name"`
				} `json:"artists"`
				Album struct {
					ID     string `json:"id"`
					Name   string `json:"name"`
					Images []struct {
						URL   string `json:"url"`
						Width int    `json:"width"`
					} `json:"images"`
				} `json:"album"`
				ExternalURLs struct {
					Spotify string `json:"spotify"`
				} `json:"external_urls"`
			} `json:"track"`
		} `json:"items"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&payload); err != nil {
		return nil, 0, res.StatusCode, err
	}
	tracks := make([]Track, 0, len(payload.Items))
	for _, item := range payload.Items {
		t := item.Track
		if t == nil || t.ID == "" || t.Name == "" || len(t.Artists) == 0 {
			continue
		}
		artwork := Artwork{}
		for _, img := range t.Album.Images {
			switch {
			case img.Width >= 640 && artwork.Large == "":
				artwork.Large = img.URL
			case img.Width >= 300 && artwork.Medium == "":
				artwork.Medium = img.URL
			case artwork.Small == "":
				artwork.Small = img.URL
			}
		}
		if artwork.Medium == "" {
			artwork.Medium = firstNonEmpty(artwork.Large, artwork.Small)
		}
		tArtists := make([]Artist, 0, len(t.Artists))
		for _, a := range t.Artists {
			if a.ID != "" && a.Name != "" {
				tArtists = append(tArtists, Artist{ID: a.ID, Name: a.Name})
			}
		}
		tracks = append(tracks, Track{
			ID:          t.ID,
			Provider:    "spotify",
			Title:       t.Name,
			Duration:    t.DurationMS / 1000,
			User:        Artist{ID: t.Artists[0].ID, Name: joinArtistNames(t.Artists)},
			Artists:     tArtists,
			Artwork:     artwork,
			Album:       AlbumInfo{ID: t.Album.ID, Name: t.Album.Name},
			ExternalURL: t.ExternalURLs.Spotify,
		})
	}
	return tracks, payload.Total, res.StatusCode, nil
}
