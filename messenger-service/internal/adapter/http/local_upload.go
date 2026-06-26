package http

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type fallbackLocalUploader struct {
	rootDir string
	baseURL string
}

func newFallbackLocalUploader() *fallbackLocalUploader {
	rootDir := strings.TrimSpace(os.Getenv("LOCAL_UPLOAD_DIR"))
	if rootDir == "" {
		rootDir = defaultFallbackUploadDir()
	}
	baseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("LOCAL_UPLOAD_BASE_URL")), "/")
	if baseURL == "" {
		baseURL = "/api/v1/messenger-uploads"
	}
	return &fallbackLocalUploader{rootDir: rootDir, baseURL: baseURL}
}

func defaultFallbackUploadDir() string {
	wd, err := os.Getwd()
	if err != nil {
		return filepath.Join(os.TempDir(), "tumlumtala-messenger-uploads")
	}
	if filepath.Base(wd) == "messenger-service" {
		return filepath.Clean(filepath.Join(wd, "..", "frontend", "uploads"))
	}
	return filepath.Clean(filepath.Join(wd, "frontend", "uploads"))
}

func (u *fallbackLocalUploader) Upload(_ context.Context, remotePath string, payload []byte, _ string) (string, error) {
	if u == nil || strings.TrimSpace(u.rootDir) == "" {
		return "", fmt.Errorf("local upload dir is not configured")
	}
	cleanRemotePath := strings.TrimLeft(filepath.Clean(remotePath), string(filepath.Separator))
	if cleanRemotePath == "." || strings.HasPrefix(cleanRemotePath, "..") {
		return "", fmt.Errorf("invalid upload path")
	}
	targetPath := filepath.Join(u.rootDir, cleanRemotePath)
	if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
		return "", err
	}
	if err := os.WriteFile(targetPath, payload, 0o644); err != nil {
		return "", err
	}
	return u.baseURL + "/" + strings.ReplaceAll(cleanRemotePath, string(filepath.Separator), "/"), nil
}
