package http

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
)

type Handler struct {
	svc *wordMatchService
}

func NewHandler(dictDir, llmURL, llmKey, llmModel string) *Handler {
	return &Handler{svc: newWordMatchService(dictDir, llmURL, llmKey, llmModel)}
}

func (h *Handler) Round(c *gin.Context) {
	baseWord := c.Query("base") // optional: syllable to continue from
	round, err := h.svc.newRound(c.Request.Context(), baseWord)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	response.OK(c, http.StatusOK, round)
}

type explainReq struct {
	Words []string `json:"words" binding:"required,min=1,max=5"`
}

func (h *Handler) Explain(c *gin.Context) {
	var req explainReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "dữ liệu không hợp lệ"})
		return
	}

	filtered := req.Words[:0]
	for _, w := range req.Words {
		if t := strings.TrimSpace(w); t != "" {
			filtered = append(filtered, t)
		}
	}
	if len(filtered) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "danh sách từ trống"})
		return
	}

	text, err := h.svc.explain(c.Request.Context(), filtered)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	response.OK(c, http.StatusOK, gin.H{"explanation": text})
}
