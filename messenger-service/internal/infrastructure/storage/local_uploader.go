package storage

import (
	"context"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"
)

type LocalUploader struct {
	rootDir string
	baseURL string
}

func NewLocalUploader(rootDir, baseURL string) (*LocalUploader, error) {
	rootDir = strings.TrimSpace(rootDir)
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if rootDir == "" {
		return nil, fmt.Errorf("missing local upload dir")
	}
	if baseURL == "" {
		baseURL = "/api/v1/messenger-uploads"
	}
	if err := os.MkdirAll(rootDir, 0o755); err != nil {
		return nil, err
	}
	return &LocalUploader{rootDir: rootDir, baseURL: baseURL}, nil
}

func (u *LocalUploader) Upload(_ context.Context, remotePath string, payload []byte, _ string) (string, error) {
	if len(payload) == 0 {
		return "", fmt.Errorf("empty payload")
	}
	normalized := strings.TrimLeft(path.Clean("/"+remotePath), "/")
	if normalized == "." || normalized == "" || strings.HasPrefix(normalized, "../") {
		return "", fmt.Errorf("invalid upload path")
	}
	target := filepath.Join(u.rootDir, filepath.FromSlash(normalized))
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return "", err
	}
	if err := os.WriteFile(target, payload, 0o644); err != nil {
		return "", err
	}
	return u.baseURL + "/" + normalized, nil
}
