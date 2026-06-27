package http

import (
	"encoding/base64"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const proxyKey = "Sy7u#Ye9!N2@Mx4$K8z&Rq3*Wj6^Lc1"

var proxyClient = &http.Client{Timeout: 15 * time.Second}

func decodeProxyToken(token string) (string, error) {
	// restore base64url → standard base64
	s := strings.NewReplacer("-", "+", "_", "/").Replace(token)
	switch len(s) % 4 {
	case 2:
		s += "=="
	case 3:
		s += "="
	}
	raw, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return "", err
	}
	key := []byte(proxyKey)
	out := make([]byte, len(raw))
	for i, b := range raw {
		out[i] = b ^ key[i%len(key)]
	}
	return string(out), nil
}

func serveProxied(c *gin.Context, token string, extraHeaders map[string]string) {
	targetURL, err := decodeProxyToken(token)
	if err != nil || !strings.HasPrefix(targetURL, "http") {
		c.Status(http.StatusBadRequest)
		return
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, targetURL, nil)
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	req.Header.Set("Referer", targetURL)
	req.Header.Set("User-Agent", "Mozilla/5.0")
	for k, v := range extraHeaders {
		req.Header.Set(k, v)
	}

	resp, err := proxyClient.Do(req)
	if err != nil {
		c.Status(http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	c.Header("Content-Type", contentType)
	c.Header("Cache-Control", "public, max-age=86400")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Status(resp.StatusCode)
	io.Copy(c.Writer, resp.Body) //nolint:errcheck
}

// ServeImage proxies image requests — /api/v1/f/:token
func (r *MoviesRoutes) ServeImage(c *gin.Context) {
	serveProxied(c, c.Param("token"), nil)
}

// ServeEmbed proxies embed page requests — /api/v1/e/:token
func (r *MoviesRoutes) ServeEmbed(c *gin.Context) {
	serveProxied(c, c.Param("token"), nil)
}

// ServeM3u8 proxies m3u8/ts stream requests — /api/v1/m/:token
func (r *MoviesRoutes) ServeM3u8(c *gin.Context) {
	serveProxied(c, c.Param("token"), map[string]string{
		"Accept": "*/*",
	})
}
