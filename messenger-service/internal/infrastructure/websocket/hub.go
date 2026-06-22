package websocket

import (
	"log"
	"sync"
)

type Hub struct {
	clients    map[*Client]bool
	rooms      map[string]map[*Client]bool
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		rooms:      make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.clients[c] = true
		case c := <-h.unregister:
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				close(c.send)

				h.mu.Lock()
				for _, room := range h.rooms {
					delete(room, c)
				}
				h.mu.Unlock()
			}
		}
	}
}

func (h *Hub) JoinRoom(roomID string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.rooms[roomID] == nil {
		h.rooms[roomID] = make(map[*Client]bool)
	}

	h.rooms[roomID][c] = true
}

func (h *Hub) BroadcastRoom(roomID string, msg Message) {
	h.mu.RLock()
	room := h.rooms[roomID]
	clients := make([]*Client, 0, len(room))
	for c := range room {
		clients = append(clients, c)
	}
	h.mu.RUnlock()

	for _, c := range clients {
		select {
		case c.send <- msg:
		default:
			log.Printf("[hub] client send buffer full, dropping message for client %s", c.id)
		}
	}
}
