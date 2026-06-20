module github.com/tumlumtala/authorization-service

go 1.25.0

require (
	github.com/go-sql-driver/mysql v1.10.0
	github.com/joho/godotenv v1.5.1
	github.com/redis/go-redis/v9 v9.20.1
	github.com/tumlumtala/contracts v0.0.0
	google.golang.org/grpc v1.81.1
	gorm.io/driver/mysql v1.6.0
	gorm.io/gorm v1.31.1
)

require (
	filippo.io/edwards25519 v1.2.0 // indirect
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/jinzhu/inflection v1.0.0 // indirect
	github.com/jinzhu/now v1.1.5 // indirect
	go.uber.org/atomic v1.11.0 // indirect
	golang.org/x/net v0.51.0 // indirect
	golang.org/x/sys v0.42.0 // indirect
	golang.org/x/text v0.34.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20260226221140-a57be14db171 // indirect
	google.golang.org/protobuf v1.36.11 // indirect
)

replace github.com/tumlumtala/contracts => ../contracts
