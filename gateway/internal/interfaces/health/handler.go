package health

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Health(c *gin.Context) {
	response.OK(c, http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) Ready(c *gin.Context) {
	response.OK(c, http.StatusOK, gin.H{"status": "ready"})
}

func (h *Handler) Live(c *gin.Context) {
	response.OK(c, http.StatusOK, gin.H{"status": "live"})
}
