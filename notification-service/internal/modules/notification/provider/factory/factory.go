package factory

import (
	"fmt"

	"tumlumtala/notification-service/internal/modules/notification/domain"
)

type Factory struct {
	providers map[domain.Channel]domain.Provider
}

func New(providers map[domain.Channel]domain.Provider) *Factory {
	return &Factory{providers: providers}
}

func (f *Factory) Provider(channel domain.Channel) (domain.Provider, error) {
	provider, ok := f.providers[channel]
	if !ok || provider == nil {
		return nil, fmt.Errorf("unsupported notification channel %q", channel)
	}
	return provider, nil
}
