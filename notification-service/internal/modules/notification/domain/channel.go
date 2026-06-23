package domain

type Channel string

const (
	ChannelEmail   Channel = "email"
	ChannelAlert   Channel = "alert"
	ChannelZalo    Channel = "zalo"
	ChannelSMS     Channel = "sms"
	ChannelWebhook Channel = "webhook"
)

func (c Channel) String() string {
	return string(c)
}
