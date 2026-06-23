package config

type RabbitMQConfig struct {
	Host               string
	Port               int
	User               string
	Password           string
	VHost              string
	Exchange           string
	Queue              string
	RoutingKey         string
	EventExchange      string
	EventQueue         string
	EventRoutingKeys   []string
	EventPrefetch      int
	EventDLQExchange   string
	EventDLQQueue      string
	EventDLQRoutingKey string
	RetryExchange      string
	RetryQueue         string
	RetryRoutingKey    string
	DLQExchange        string
	DLQQueue           string
	DLQRoutingKey      string
	Prefetch           int
	Workers            int
	MaxRetries         int
	RetryDelayMs       int
}
