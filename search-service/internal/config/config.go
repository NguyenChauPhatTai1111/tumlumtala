package config

import "search-service/utils"

type Config struct {
	App            AppConfig
	Log            LogConfig
	Observarbility ObservarbilityConfig
}

func Load() Config {
	return Config{
		App: AppConfig{
			Name: utils.GetEnv("APP_NAME", "search_service"),
			Env:  utils.GetEnv("APP_ENV", "local"),
			Port: utils.GetEnvInt("APP_PORT", 20000),
		},
		Log: LogConfig{
			Level: utils.GetEnv("LOG_LEVEL", "info"),
			JSON:  utils.GetEnvBool("LOG_JSON", true),
		},
	}
}
