package conversation

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	maxImageUploadSize = 10 << 20  // 10MB
	maxVideoUploadSize = 100 << 20 // 100MB
)

// MessengerAssetUploader is implemented by any CDN/storage client.
type MessengerAssetUploader interface {
	Upload(ctx context.Context, remotePath string, payload []byte, contentType string) (string, error)
}

// MediaUploadService handles file uploads for the messenger.
type MediaUploadService struct {
	uploader MessengerAssetUploader
}

// NewMediaUploadService creates a MediaUploadService backed by the given uploader.
func NewMediaUploadService(uploader MessengerAssetUploader) *MediaUploadService {
	return &MediaUploadService{uploader: uploader}
}

func (s *MediaUploadService) UploadConversationAvatar(ctx context.Context, conversationID uint, fileHeader *multipart.FileHeader) (string, error) {
	return s.uploadConversationAsset(ctx, "avatars", conversationID, fileHeader)
}

func (s *MediaUploadService) UploadConversationTheme(ctx context.Context, conversationID uint, fileHeader *multipart.FileHeader) (string, error) {
	return s.uploadConversationAsset(ctx, "themes", conversationID, fileHeader)
}

func (s *MediaUploadService) UploadMessageAttachment(ctx context.Context, conversationID uint, fileHeader *multipart.FileHeader) (string, error) {
	return s.uploadFileAttachment(ctx, conversationID, fileHeader)
}

func (s *MediaUploadService) uploadFileAttachment(ctx context.Context, conversationID uint, fileHeader *multipart.FileHeader) (string, error) {
	if s == nil || s.uploader == nil {
		return "", fmt.Errorf("messenger uploader is not configured")
	}
	if fileHeader == nil {
		return "", fmt.Errorf("missing file")
	}
	if fileHeader.Size <= 0 {
		return "", fmt.Errorf("empty file")
	}
	if fileHeader.Size > maxVideoUploadSize {
		return "", fmt.Errorf("file too large: max 100MB")
	}

	src, err := fileHeader.Open()
	if err != nil {
		return "", fmt.Errorf("cannot open file: %w", err)
	}
	defer src.Close()

	raw, err := readUploadLimited(src, maxVideoUploadSize+1)
	if err != nil {
		return "", fmt.Errorf("cannot read file: %w", err)
	}

	mimeType := http.DetectContentType(raw)
	ext := extensionByMime(mimeType)

	if ext == "" {
		ext = safeDocumentExtension(fileHeader.Filename)
		if ext == "" {
			return "", fmt.Errorf("unsupported file type")
		}
	} else if strings.HasPrefix(mimeType, "image/") && int64(len(raw)) > maxImageUploadSize {
		return "", fmt.Errorf("image too large: max 10MB")
	}

	shortID := strings.ReplaceAll(uuid.NewString(), "-", "")[:8]
	filename := fmt.Sprintf("conversation_%d_%d_%s%s", conversationID, time.Now().Unix(), shortID, ext)
	remotePath := path.Join("messenger", "attachments", filename)

	assetURL, err := s.uploader.Upload(ctx, remotePath, raw, mimeType)
	if err != nil {
		return "", err
	}

	return assetURL, nil
}

func (s *MediaUploadService) uploadConversationAsset(ctx context.Context, kind string, conversationID uint, fileHeader *multipart.FileHeader) (string, error) {
	if s == nil || s.uploader == nil {
		return "", fmt.Errorf("messenger uploader is not configured")
	}
	if fileHeader == nil {
		return "", fmt.Errorf("missing file")
	}
	if fileHeader.Size <= 0 {
		return "", fmt.Errorf("empty file")
	}
	if fileHeader.Size > maxVideoUploadSize {
		return "", fmt.Errorf("file too large: max 100MB")
	}

	src, err := fileHeader.Open()
	if err != nil {
		return "", fmt.Errorf("cannot open file: %w", err)
	}
	defer src.Close()

	raw, err := readUploadLimited(src, maxVideoUploadSize+1)
	if err != nil {
		return "", fmt.Errorf("cannot read file: %w", err)
	}

	mimeType := http.DetectContentType(raw)
	ext := extensionByMime(mimeType)
	if ext == "" {
		return "", fmt.Errorf("invalid file type: only images and videos are allowed")
	}

	maxSize := maxSizeForMime(mimeType)
	if int64(len(raw)) > maxSize {
		if strings.HasPrefix(mimeType, "video/") {
			return "", fmt.Errorf("video too large: max 100MB")
		}
		return "", fmt.Errorf("image too large: max 10MB")
	}

	shortID := strings.ReplaceAll(uuid.NewString(), "-", "")[:8]
	filename := fmt.Sprintf("conversation_%d_%d_%s%s", conversationID, time.Now().Unix(), shortID, ext)
	remotePath := path.Join("messenger", kind, filename)

	assetURL, err := s.uploader.Upload(ctx, remotePath, raw, mimeType)
	if err != nil {
		return "", err
	}

	return assetURL, nil
}

func maxSizeForMime(mimeType string) int64 {
	if strings.HasPrefix(mimeType, "video/") {
		return maxVideoUploadSize
	}
	return maxImageUploadSize
}

func extensionByMime(mimeType string) string {
	switch mimeType {
	case "image/png":
		return ".png"
	case "image/jpeg":
		return ".jpg"
	case "image/webp":
		return ".webp"
	case "video/mp4":
		return ".mp4"
	case "video/webm":
		return ".webm"
	case "video/ogg":
		return ".ogv"
	case "video/quicktime":
		return ".mov"
	default:
		return ""
	}
}

func readUploadLimited(src multipart.File, maxBytes int64) ([]byte, error) {
	return io.ReadAll(io.LimitReader(src, maxBytes))
}

var allowedDocExtensions = map[string]bool{
	".pdf": true, ".doc": true, ".docx": true,
	".xls": true, ".xlsx": true, ".ppt": true, ".pptx": true,
	".txt": true, ".csv": true, ".zip": true, ".rar": true, ".7z": true,
}

func safeDocumentExtension(filename string) string {
	ext := strings.ToLower(path.Ext(filename))
	if allowedDocExtensions[ext] {
		return ext
	}
	return ""
}
