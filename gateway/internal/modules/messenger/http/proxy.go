package http

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
)

// MessengerProxy reverse-proxies HTTP and WebSocket requests to the messenger-service.
type MessengerProxy struct {
	proxy       *httputil.ReverseProxy
	targetURL   *url.URL
	targetHost  string // host:port for raw TCP dial
}

func NewMessengerProxy(messengerServiceURL string) (*MessengerProxy, error) {
	target, err := url.Parse(messengerServiceURL)
	if err != nil {
		return nil, err
	}

	host := target.Hostname()
	port := target.Port()
	if port == "" {
		if target.Scheme == "https" {
			port = "443"
		} else {
			port = "80"
		}
	}

	return &MessengerProxy{
		proxy:      httputil.NewSingleHostReverseProxy(target),
		targetURL:  target,
		targetHost: fmt.Sprintf("%s:%s", host, port),
	}, nil
}

func (p *MessengerProxy) ServeHTTP(c *gin.Context) {
	if claims, ok := contextx.Claims(c.Request.Context()); ok {
		c.Request.Header.Set("X-User-ID", claims.UserID)
	}
	p.proxy.ServeHTTP(c.Writer, c.Request)
}

// ServeWS tunnels a WebSocket upgrade request to the upstream messenger-service.
// httputil.ReverseProxy does not support WebSocket (it buffers the body and does
// not forward the Upgrade handshake), so we dial the upstream directly and copy
// bytes in both directions.
func (p *MessengerProxy) ServeWS(c *gin.Context) {
	// Rewrite the request URI to the upstream path.
	req := c.Request
	req.URL.Scheme = p.targetURL.Scheme
	req.URL.Host = p.targetURL.Host

	// Ensure required WebSocket upgrade headers are present.
	req.Header.Set("Connection", "Upgrade")
	req.Header.Set("Upgrade", "websocket")

	// Dial the upstream TCP connection.
	upstream, err := net.Dial("tcp", p.targetHost)
	if err != nil {
		c.AbortWithStatus(http.StatusBadGateway)
		return
	}
	defer upstream.Close()

	// Hijack the client connection so we can do raw byte copying.
	hijacker, ok := c.Writer.(http.Hijacker)
	if !ok {
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	clientConn, clientBuf, err := hijacker.Hijack()
	if err != nil {
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	defer clientConn.Close()

	// Forward the original HTTP Upgrade request to the upstream.
	if err := req.Write(upstream); err != nil {
		return
	}

	// Flush any bytes already buffered by the hijacker's bufio.Reader.
	if clientBuf.Reader.Buffered() > 0 {
		buffered := make([]byte, clientBuf.Reader.Buffered())
		if _, err := clientBuf.Reader.Read(buffered); err == nil {
			upstream.Write(buffered) //nolint:errcheck
		}
	}

	// Bidirectional copy until one side closes.
	done := make(chan struct{}, 2)
	cp := func(dst io.Writer, src io.Reader) {
		io.Copy(dst, src) //nolint:errcheck
		done <- struct{}{}
	}
	go cp(upstream, clientConn)
	go cp(clientConn, upstream)
	<-done
}
