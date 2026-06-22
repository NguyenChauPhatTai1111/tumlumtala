package websocket

import (
	"net/http"

	"github.com/gorilla/websocket"
)

var DefaultUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func Upgrade(w http.ResponseWriter, r *http.Request) (*websocket.Conn, error) {
	return DefaultUpgrader.Upgrade(w, r, nil)
}
