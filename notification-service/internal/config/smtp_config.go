package config

type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}
