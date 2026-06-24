package http

import (
	"net/http/httputil"
	"net/url"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
)

type MusicsProxy struct {
	proxy *httputil.ReverseProxy
}

func NewMusicsProxy(musicsServiceURL string) (*MusicsProxy, error) {
	target, err := url.Parse(musicsServiceURL)
	if err != nil {
		return nil, err
	}
	return &MusicsProxy{proxy: httputil.NewSingleHostReverseProxy(target)}, nil
}

func (p *MusicsProxy) ServeHTTP(c *gin.Context) {
	if claims, ok := contextx.Claims(c.Request.Context()); ok {
		c.Request.Header.Set("X-User-ID", claims.UserID)
	}
	p.proxy.ServeHTTP(c.Writer, c.Request)
}
