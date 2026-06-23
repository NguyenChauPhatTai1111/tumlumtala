package rabbitmq

const (
	DefaultExchangeName = "domain.events"
	DefaultExchangeType = "topic"
)

type Config struct {
	URL          string
	ExchangeName string
	ExchangeType string
}
