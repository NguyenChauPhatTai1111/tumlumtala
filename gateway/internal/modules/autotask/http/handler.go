package http

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
)

var issueIDRe = regexp.MustCompile(`^\d+$`)

type Handler struct {
	redmineAPIKey string
}

func NewHandler(redmineAPIKey string) *Handler { return &Handler{redmineAPIKey: redmineAPIKey} }

type fetchTitleReq struct {
	IssueID string `json:"issue_id" binding:"required"`
}

type comtorResp struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type fetchTitleResp struct {
	Title          string       `json:"title"`
	IssueID        string       `json:"issue_id"`
	IssueURL       string       `json:"issue_url"`
	UserStoryID    int          `json:"user_story_id"`
	UserStoryURL   string       `json:"user_story_url"`
	StartDate      string       `json:"start_date"`
	EstimatedHours *float64     `json:"estimated_hours"`
	Comtors        []comtorResp `json:"comtors"`
	PullRequestURL string       `json:"pull_request_url"`
	TaskSubject    string       `json:"task_subject"`
}

func (h *Handler) FetchTitle(c *gin.Context) {
	var req fetchTitleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "issue_id là bắt buộc"})
		return
	}

	id := strings.TrimSpace(req.IssueID)
	if !issueIDRe.MatchString(id) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "issue_id phải là số nguyên dương"})
		return
	}

	issue, userStory, err := resolveIssue(c.Request.Context(), id, h.redmineAPIKey)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}

	issueURL := fmt.Sprintf("%s/%s", redmineBase, id)
	userStoryURL := fmt.Sprintf("%s/%d", redmineBase, userStory.ID)
	if issue.ID == userStory.ID {
		issueURL = userStoryURL
	}

	comtors := make([]comtorResp, len(userStory.Comtors))
	for i, c := range userStory.Comtors {
		comtors[i] = comtorResp{ID: c.ID, Name: c.Name}
	}

	response.OK(c, http.StatusOK, fetchTitleResp{
		Title:          userStory.Subject,
		IssueID:        id,
		IssueURL:       issueURL,
		UserStoryID:    userStory.ID,
		UserStoryURL:   userStoryURL,
		StartDate:      issue.StartDate,
		EstimatedHours: issue.EstimatedHours,
		Comtors:        comtors,
		PullRequestURL: ParsePRURL(userStory.Description),
		TaskSubject:    issue.Subject,
	})
}
