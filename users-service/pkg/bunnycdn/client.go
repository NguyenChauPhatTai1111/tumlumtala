package bunnycdn

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"strings"
	"time"
)

type Client struct {
	storageZone   string
	storageKey    string
	uploadBaseURL string
	baseURL       string
	httpClient    *http.Client
}

func NewClientFromEnv() (*Client, error) {
	storageZone := strings.TrimSpace(os.Getenv("BUNNYCDN_STORAGE_ZONE"))
	storageKey := strings.TrimSpace(os.Getenv("BUNNYCDN_API_KEY"))
	uploadBaseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("BUNNYCDN_STORAGE_BASE_URL")), "/")
	baseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("BUNNYCDN_CDN_BASE_URL")), "/")

	if storageZone == "" {
		return nil, fmt.Errorf("missing BUNNYCDN_STORAGE_ZONE")
	}
	if storageKey == "" {
		return nil, fmt.Errorf("missing BUNNYCDN_API_KEY")
	}
	if uploadBaseURL == "" {
		uploadBaseURL = "https://storage.bunnycdn.com"
	}
	if baseURL == "" {
		return nil, fmt.Errorf("missing BUNNYCDN_CDN_BASE_URL")
	}

	if _, err := url.ParseRequestURI(uploadBaseURL); err != nil {
		return nil, fmt.Errorf("invalid BUNNYCDN_STORAGE_BASE_URL: %w", err)
	}
	if _, err := url.ParseRequestURI(baseURL); err != nil {
		return nil, fmt.Errorf("invalid BUNNYCDN_CDN_BASE_URL: %w", err)
	}

	return &Client{
		storageZone:   storageZone,
		storageKey:    storageKey,
		uploadBaseURL: uploadBaseURL,
		baseURL:       baseURL,
		httpClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}, nil
}

func (c *Client) Upload(ctx context.Context, remotePath string, payload []byte, contentType string) (string, error) {
	if len(payload) == 0 {
		return "", fmt.Errorf("empty payload")
	}

	normalized := strings.TrimLeft(path.Clean(remotePath), "/")
	if normalized == "." || normalized == "" {
		return "", fmt.Errorf("invalid remote path")
	}

	uploadURL := c.buildUploadURL(normalized)
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, uploadURL, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("AccessKey", c.storageKey)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return "", fmt.Errorf("bunny upload failed: status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	publicURL := c.buildPublicURL(normalized)
	return publicURL, nil
}

// DeleteFolder deletes an entire folder and all its contents in one API call.
// folderPath must not have a leading slash, e.g. "stickers" or "users/avatars".
func (c *Client) DeleteFolder(ctx context.Context, folderPath string) error {
	normalized := strings.TrimLeft(path.Clean(folderPath), "/")
	if normalized == "." || normalized == "" {
		return fmt.Errorf("invalid folder path")
	}
	deleteURL := c.buildUploadURL(normalized) + "/"
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, deleteURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("AccessKey", c.storageKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("bunny delete folder failed: status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return nil
}

func (c *Client) Delete(ctx context.Context, remotePath string) error {
	normalized := strings.TrimLeft(path.Clean(remotePath), "/")
	if normalized == "." || normalized == "" {
		return fmt.Errorf("invalid remote path")
	}

	deleteURL := c.buildUploadURL(normalized)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, deleteURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("AccessKey", c.storageKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("bunny delete failed: status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	return nil
}

type StorageObject struct {
	ObjectName  string `json:"ObjectName"`
	IsDirectory bool   `json:"IsDirectory"`
}

// ListFolder lists the contents of a folder in the storage zone.
// Pass an empty path to list the root.
func (c *Client) ListFolder(ctx context.Context, folderPath string) ([]StorageObject, error) {
	normalized := strings.TrimLeft(path.Clean("/"+folderPath), "/")
	listURL := fmt.Sprintf("%s/%s/%s/", c.uploadBaseURL, c.storageZone, normalized)
	if normalized == "." || normalized == "" {
		listURL = fmt.Sprintf("%s/%s/", c.uploadBaseURL, c.storageZone)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, listURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("AccessKey", c.storageKey)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("bunny list failed: status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var objects []StorageObject
	if err := json.Unmarshal(body, &objects); err != nil {
		return nil, fmt.Errorf("bunny list parse failed: %w", err)
	}
	return objects, nil
}

func (c *Client) buildUploadURL(normalized string) string {
	return fmt.Sprintf("%s/%s/%s", c.uploadBaseURL, c.storageZone, normalized)
}

func (c *Client) buildPublicURL(normalized string) string {
	return fmt.Sprintf("%s/%s", c.baseURL, normalized)
}
