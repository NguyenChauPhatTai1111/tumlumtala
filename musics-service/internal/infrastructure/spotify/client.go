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

type Track struct {
	ID          string  `json:"id"`
	Provider    string  `json:"provider"`
	Title       string  `json:"title"`
	Duration    int     `json:"duration"`
	CreatedAt   string  `json:"created_at,omitempty"`
	User        Artist  `json:"user"`
	Artwork     Artwork `json:"artwork"`
	PlayCount   int     `json:"play_count,omitempty"`
	ExternalURL string  `json:"external_url"`
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
		tracks = append(tracks, Track{
			ID:          item.ID,
			Provider:    "spotify",
			Title:       item.Name,
			Duration:    item.DurationMS / 1000,
			CreatedAt:   item.Album.ReleaseDate,
			User:        Artist{ID: item.Artists[0].ID, Name: joinArtistNames(item.Artists)},
			Artwork:     artwork,
			ExternalURL: item.ExternalURLs.Spotify,
		})
	}
	return tracks, res.StatusCode, nil
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
		tracks = append(tracks, Track{
			ID:          item.ID,
			Provider:    "spotify",
			Title:       item.Name,
			Duration:    item.DurationMS / 1000,
			CreatedAt:   item.Album.ReleaseDate,
			User:        Artist{ID: item.Artists[0].ID, Name: joinArtistNames(item.Artists)},
			Artwork:     artwork,
			ExternalURL: item.ExternalURLs.Spotify,
		})
	}
	return tracks, res.StatusCode, nil
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
