package tmdb

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const baseURL = "https://api.themoviedb.org/3"

var preferredCountries = []string{"US", "GB", "AU", "CA"}

type Client struct {
	apiKey     string
	httpClient *http.Client
}

func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *Client) GetCertification(ctx context.Context, tmdbID, tmdbType string) (string, error) {
	if c.apiKey == "" {
		return "", nil
	}
	if tmdbType == "tv" {
		return c.getTVRating(ctx, tmdbID)
	}
	return c.getMovieRating(ctx, tmdbID)
}

type movieReleaseDateEntry struct {
	Certification string `json:"certification"`
}

type movieReleaseDateCountry struct {
	Iso31661     string                  `json:"iso_3166_1"`
	ReleaseDates []movieReleaseDateEntry `json:"release_dates"`
}

type movieReleaseDatesResponse struct {
	Results []movieReleaseDateCountry `json:"results"`
}

func (c *Client) getMovieRating(ctx context.Context, tmdbID string) (string, error) {
	url := fmt.Sprintf("%s/movie/%s/release_dates?api_key=%s", baseURL, tmdbID, c.apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", nil
	}
	var data movieReleaseDatesResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", err
	}
	for _, country := range preferredCountries {
		for _, r := range data.Results {
			if r.Iso31661 == country {
				for _, d := range r.ReleaseDates {
					if d.Certification != "" {
						return mapToVietnamRating(d.Certification), nil
					}
				}
			}
		}
	}
	for _, r := range data.Results {
		for _, d := range r.ReleaseDates {
			if d.Certification != "" {
				return mapToVietnamRating(d.Certification), nil
			}
		}
	}
	return "", nil
}

type tvContentRating struct {
	Iso31661 string `json:"iso_3166_1"`
	Rating   string `json:"rating"`
}

type tvContentRatingsResponse struct {
	Results []tvContentRating `json:"results"`
}

func (c *Client) getTVRating(ctx context.Context, tmdbID string) (string, error) {
	url := fmt.Sprintf("%s/tv/%s/content_ratings?api_key=%s", baseURL, tmdbID, c.apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", nil
	}
	var data tvContentRatingsResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", err
	}
	for _, country := range preferredCountries {
		for _, r := range data.Results {
			if r.Iso31661 == country && r.Rating != "" {
				return mapToVietnamRating(r.Rating), nil
			}
		}
	}
	for _, r := range data.Results {
		if r.Rating != "" {
			return mapToVietnamRating(r.Rating), nil
		}
	}
	return "", nil
}

func mapToVietnamRating(cert string) string {
	switch cert {
	case "G", "TV-G":
		return "P"
	case "PG", "TV-PG", "14+":
		return "T13"
	case "PG-13", "TV-14":
		return "T13"
	case "R", "15", "MA 15+", "MA15+":
		return "T16"
	case "NC-17", "18+", "TV-MA", "R18+":
		return "T18"
	default:
		return ""
	}
}
