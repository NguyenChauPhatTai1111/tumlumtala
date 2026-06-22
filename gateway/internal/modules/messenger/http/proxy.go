package http

import (
	"net/http/httputil"
	"net/url"

	"github.com/gin-gonic/gin"
)

// MessengerProxy reverse-proxies HTTP and WebSocket requests to the messenger-service.
type MessengerProxy struct {
	proxy     *httputil.ReverseProxy
	wsProxy   *httputil.ReverseProxy
	targetURL *url.URL
}

func NewMessengerProxy(messengerServiceURL string) (*MessengerProxy, error) {
	target, err := url.Parse(messengerServiceURL)
	if err != nil {
		return nil, err
	}

	wsTarget := *target
	if wsTarget.Scheme == "http" {
		wsTarget.Scheme = "ws"
	} else if wsTarget.Scheme == "https" {
		wsTarget.Scheme = "wss"
	}

	return &MessengerProxy{
		proxy:     httputil.NewSingleHostReverseProxy(target),
		wsProxy:   httputil.NewSingleHostReverseProxy(&wsTarget),
		targetURL: target,
	}, nil
}

func (p *MessengerProxy) ServeHTTP(c *gin.Context) {
	p.proxy.ServeHTTP(c.Writer, c.Request)
}

func (p *MessengerProxy) ServeWS(c *gin.Context) {
	p.wsProxy.ServeHTTP(c.Writer, c.Request)
}
