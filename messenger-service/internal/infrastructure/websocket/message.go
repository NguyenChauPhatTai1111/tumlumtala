package websocket

import "encoding/json"

type Message struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
	Sender  string          `json:"sender,omitempty"`
}

func (m *Message) UnmarshalJSON(data []byte) error {
	type alias Message
	var input alias
	if err := json.Unmarshal(data, &input); err != nil {
		return err
	}

	m.Type = input.Type
	m.Sender = input.Sender

	if len(input.Payload) > 0 {
		m.Payload = input.Payload
		return nil
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}

	delete(raw, "type")
	delete(raw, "payload")
	delete(raw, "sender")

	if len(raw) == 0 {
		m.Payload = nil
		return nil
	}

	payload, err := json.Marshal(raw)
	if err != nil {
		return err
	}

	m.Payload = payload
	return nil
}

func NewMessage(msgType string, payload interface{}) (Message, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return Message{}, err
	}
	return Message{
		Type:    msgType,
		Payload: data,
	}, nil
}
