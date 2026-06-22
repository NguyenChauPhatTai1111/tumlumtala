package websocket

import (
	"log"
	"sync"
	"time"
)

type ConnectionPool struct {
	clients sync.Map
}

func NewConnectionPool() *ConnectionPool {
	return &ConnectionPool{}
}

func (p *ConnectionPool) Add(client *Client) {
	p.clients.Store(client.id, client)
	client.hub.register <- client

	go client.writePump()
	go client.readPump()

	go func() {
		select {
		case <-client.activatedCh:
			return
		case <-time.After(activationTimeout):
			log.Println("WS not activated, closing:", client.id)
			client.cancel()
		case <-client.ctx.Done():
			return
		}
	}()
}

func (p *ConnectionPool) Remove(id string) {
	if v, ok := p.clients.Load(id); ok {
		client := v.(*Client)
		client.cancel()
		p.clients.Delete(id)
	}
}

func (p *ConnectionPool) Broadcast(msg Message) {
	p.clients.Range(func(_, value interface{}) bool {
		client := value.(*Client)

		select {
		case client.send <- msg:
		default:
			client.cancel()
			p.clients.Delete(client.id)
		}

		return true
	})
}

func (p *ConnectionPool) SendTo(id string, msg Message) {
	if v, ok := p.clients.Load(id); ok {
		client := v.(*Client)

		select {
		case client.send <- msg:
		default:
			client.cancel()
			p.clients.Delete(client.id)
		}
	}
}
