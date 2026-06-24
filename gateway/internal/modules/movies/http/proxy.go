package http

import (
	"net/http/httputil"
	"net/url"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
)

type MoviesProxy struct {
	proxy *httputil.ReverseProxy
}

func NewMoviesProxy(moviesServiceURL string) (*MoviesProxy, error) {
	target, err := url.Parse(moviesServiceURL)
	if err != nil {
		return nil, err
	}
	return &MoviesProxy{proxy: httputil.NewSingleHostReverseProxy(target)}, nil
}

func (p *MoviesProxy) ServeHTTP(c *gin.Context) {
	if claims, ok := contextx.Claims(c.Request.Context()); ok {
		c.Request.Header.Set("X-User-ID", claims.UserID)
	}
	p.proxy.ServeHTTP(c.Writer, c.Request)
}
