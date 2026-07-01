package http

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"time"
)

const redmineBase = "https://redmine.thk-hd.vn/issues"

// redmineClient skips TLS verification because the internal Redmine server
// uses a self-signed mkcert certificate that is not in any public CA bundle.
var redmineClient = &http.Client{
	Transport: &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, //nolint:gosec
	},
	Timeout: 15 * time.Second,
}

type redmineMember struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// prURLRe parses Redmine description (Markdown from JSON API).
// Two formats supported (case-insensitive):
//  1. Label + colon + URL on same line:  "PR: https://..."  "Pull Request: https://..."
//  2. Label on its own line, URL on next: "**Pull Request**\nhttps://..."
var prURLRe = regexp.MustCompile(`(?im)^(?:#{1,6}\s*)?\*{0,2}(?:pull[\s\-_]*request|pr)\*{0,2}\s*(?::\s*(https?://\S+)|[\r\n]+(https?://\S+))`)

type redmineIssue struct {
	ID      int    `json:"id"`
	Subject string `json:"subject"`
	Tracker struct {
		Name string `json:"name"`
	} `json:"tracker"`
	Parent *struct {
		ID int `json:"id"`
	} `json:"parent"`
	StartDate      string          `json:"start_date"`
	EstimatedHours *float64        `json:"estimated_hours"`
	Comtors        []redmineMember `json:"comtors"`
	Description    string          `json:"description"`
}

// ParsePRURL extracts a Pull Request URL from a Redmine issue description (Markdown).
func ParsePRURL(description string) string {
	m := prURLRe.FindStringSubmatch(description)
	// group 1 = same-line URL (PR: https://...), group 2 = next-line URL
	for _, g := range m[1:] {
		if g != "" {
			return g
		}
	}
	return ""
}

type redmineIssueResp struct {
	Issue redmineIssue `json:"issue"`
}

// resolveIssue trả về (issue gốc, user story, error).
// Nếu issue đã là User Story thì cả hai cùng trỏ về nó.
// Nếu là Task thì fetch thêm parent để lấy User Story.
func resolveIssue(ctx context.Context, issueID, apiKey string) (*redmineIssue, *redmineIssue, error) {
	issue, err := getIssue(ctx, issueID, apiKey)
	if err != nil {
		return nil, nil, err
	}

	if issue.Tracker.Name == "User Story" {
		return issue, issue, nil
	}

	if issue.Parent == nil {
		return issue, issue, nil
	}

	parent, err := getIssue(ctx, strconv.Itoa(issue.Parent.ID), apiKey)
	if err != nil {
		return nil, nil, fmt.Errorf("không thể lấy User Story (parent #%d): %w", issue.Parent.ID, err)
	}
	return issue, parent, nil
}

func getIssue(ctx context.Context, issueID, apiKey string) (*redmineIssue, error) {
	url := fmt.Sprintf("%s/%s.json?include=description", redmineBase, issueID)

	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Redmine-API-Key", apiKey)

	resp, err := redmineClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("không thể kết nối Redmine: %w", err)
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusNotFound:
		return nil, fmt.Errorf("issue #%s không tồn tại", issueID)
	case http.StatusUnauthorized, http.StatusForbidden:
		return nil, fmt.Errorf("Redmine API key không hợp lệ hoặc không có quyền truy cập")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Redmine trả về HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if err != nil {
		return nil, err
	}

	var result redmineIssueResp
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("không thể parse response từ Redmine")
	}

	if result.Issue.Subject == "" {
		return nil, fmt.Errorf("issue #%s không có tiêu đề", issueID)
	}

	return &result.Issue, nil
}
