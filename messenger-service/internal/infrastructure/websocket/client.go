package websocket

import (
	"context"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait         = 10 * time.Second
	pongWait          = 60 * time.Second
	pingPeriod        = (pongWait * 9) / 10
	activationTimeout = 30 * time.Second
)

type Client struct {
	id     string
	userID uint

	conn    *websocket.Conn
	send    chan Message
	pool    *ConnectionPool
	hub     *Hub
	handler MessageHandler

	ctx    context.Context
	cancel context.CancelFunc

	activated      bool
	activationOnce sync.Once
	activatedCh    chan struct{}
}

func NewClient(ctx context.Context, id string, userID uint, conn *websocket.Conn, pool *ConnectionPool, hub *Hub, handler MessageHandler) *Client {
	ctx, cancel := context.WithCancel(ctx)

	return &Client{
		id:          id,
		userID:      userID,
		conn:        conn,
		send:        make(chan Message, 256),
		pool:        pool,
		hub:         hub,
		handler:     handler,
		ctx:         ctx,
		cancel:      cancel,
		activated:   false,
		activatedCh: make(chan struct{}),
	}
}

func (c *Client) ID() string {
	return c.id
}

func (c *Client) UserID() uint {
	return c.userID
}

func (c *Client) Send(msg Message) {
	select {
	case c.send <- msg:
	default:
	}
}

func (c *Client) Activate() {
	c.activationOnce.Do(func() {
		c.activated = true
		close(c.activatedCh)
	})
}

type MessageHandler interface {
	Handle(c *Client, msg Message)
}

type DisconnectHandler interface {
	OnDisconnect(c *Client)
}

func (c *Client) readPump() {
	defer func() {
		if handler, ok := c.handler.(DisconnectHandler); ok {
			handler.OnDisconnect(c)
		}

		c.pool.clients.Delete(c.id)
		c.hub.unregister <- c // Hub closes c.send when unregistering

		c.cancel()
		_ = c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		select {
		case <-c.ctx.Done():
			return
		default:
			var msg Message
			if err := c.conn.ReadJSON(&msg); err != nil {
				return
			}

			if !c.activated {
				msgType := strings.ToLower(strings.TrimSpace(msg.Type))
				if msgType != "room.join" && msgType != "messenger.subscribe" && msgType != "join_room" {
					log.Println("first message must be room.join, messenger.subscribe, or join_room:", c.id)
					return
				}
			}

			c.handler.Handle(c, msg)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)

	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case <-c.ctx.Done():
			return

		case msg, ok := <-c.send:
			if !ok {
				return
			}

			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteJSON(msg); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
