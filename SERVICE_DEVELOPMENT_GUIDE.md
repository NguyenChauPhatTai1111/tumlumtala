# Hướng dẫn thêm microservice mới

Tài liệu này hướng dẫn cách xây dựng một service mới theo cấu trúc của `users-service`, ví dụ `products-service`. Mỗi service sở hữu business logic, migration và seeder của mình; các thành phần dùng chung như MySQL và Redis nằm trong `infra`.

## 1. Quy ước hệ thống

### Tên service và database

Tên thư mục dùng dạng `<domain>-service`, còn database dùng dạng `tumlumtala_<domain>`:

| Service | Database | Phạm vi sở hữu |
|---|---|---|
| `users-service` | `tumlumtala_users` | User, profile và dữ liệu liên quan user |
| `products-service` | `tumlumtala_products` | Product, category và dữ liệu liên quan product |

Không đọc hoặc ghi trực tiếp bảng thuộc database của service khác. Khi cần dữ liệu liên service, sử dụng gRPC hoặc event contract.

### Hạ tầng dùng chung

- MySQL container: `tumlumtala-mysql`.
- Docker network: `tumlumtala-net`.
- MySQL host từ container: `tumlumtala-mysql:3306`.
- MySQL host từ máy local: `localhost:23306`.

## 2. Cấu trúc service

Một service mới nên theo cấu trúc sau:

```text
products-service/
├── cmd/
│   ├── api/main.go                  # Service entrypoint
│   └── seed/main.go                 # Seeder entrypoint
├── internal/
│   ├── adapter/grpc/                 # Controller, interceptor, protocol mapper
│   ├── application/
│   │   ├── dto/                      # Input/output DTO
│   │   ├── queryservice/             # Read-side interfaces
│   │   └── usecase/                  # Business use cases
│   ├── bootstrap/                    # Dependency wiring
│   ├── config/                       # Environment loader và validation
│   ├── domain/
│   │   ├── entity/                   # Domain entities
│   │   ├── errors/                   # Domain errors
│   │   └── repository/               # Write-side interfaces
│   └── infrastructure/
│       ├── db/
│       │   ├── connection.go         # GORM/MySQL connection
│       │   ├── migrations/           # SQL schema migrations
│       │   └── seeders/              # Seeder interface, runner và Go seeders
│       └── persistence/
│           ├── model/                # GORM models và domain mapper
│           ├── queryservice/          # GORM read implementations
│           └── repository/            # GORM write implementations
├── scripts/database.sh               # Ensure/fresh database của service
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── Makefile
├── go.mod
└── README.md
```

Dependency phải đi theo chiều:

```text
adapter → application → domain
infrastructure ───────→ domain/application interfaces
bootstrap → tất cả implementation để dependency injection
```

Domain và use case không được import GORM, MySQL hoặc protobuf.

## 3. Khai báo contract

Thêm protobuf vào `contracts/grpc`, ví dụ:

```text
contracts/grpc/product.proto
```

Sau đó thêm file vào lệnh `protoc` trong `contracts/Dockerfile` và sinh lại code:

```bash
make proto
```

Controller gRPC của service implement interface được sinh trong `contracts/generated`.

## 4. Environment

Mỗi service cần commit `.env.example` nhưng không commit `.env`:

```dotenv
PORT=25053
CORS_ORIGIN=http://localhost:3000

DB_HOST=localhost
DB_PORT=23306
DB_USER=tumlum
DB_PASSWORD=tala
DB_NAME=tumlumtala_products
```

Khi chạy bằng Docker, override `DB_HOST` thành `tumlumtala-mysql` và `DB_PORT` thành `3306`.

Tạo cấu hình local:

```bash
cp .env.example .env
```

API key authentication thuộc trách nhiệm của gateway và không được lặp lại trong internal service. `CORS_ORIGIN` dành cho HTTP/gRPC-Web gateway; native gRPC không áp dụng CORS.

## 5. Cấu hình MySQL database mới

Khai báo database mà service sở hữu trong Makefile của service:

```makefile
DATABASE_NAME ?= tumlumtala_products
DATABASE_USER ?= tumlum
DATABASE_PASSWORD ?= tala
```

Service mới phải có `scripts/database.sh` tương tự `users-service`. Makefile truyền ba biến trên vào script qua `docker exec -e`; script có trách nhiệm:

1. Tạo database nếu chưa tồn tại.
2. Tạo hoặc cập nhật database user.
3. Grant quyền chỉ trên database của service.
4. Chỉ drop database của chính service khi chạy chế độ `fresh`.

Không dùng `docker compose down -v` để fresh một service vì MySQL volume chứa database của nhiều service.

## 6. Migration và seeder

Đặt migration theo thứ tự tăng dần:

```text
internal/infrastructure/db/migrations/
├── 001_create_products.sql
└── 002_create_categories.sql
```

Seeder phải viết bằng Go, sử dụng DTO/usecase đã khai báo thay vì thực thi SQL trực tiếp:

```go
func (s *ProductSeeder) Run(ctx context.Context) error {
    products := []dto.CreateProductInput{
        {Name: "Product A", Price: 100},
        {Name: "Product B", Price: 200},
    }

    for _, input := range products {
        if _, err := s.createProduct.Execute(ctx, input); err != nil {
            return err
        }
    }
    return nil
}
```

Với dữ liệu UUID, dùng package `github.com/google/uuid` (`uuid.NewString()` hoặc `uuid.New()`) trong business flow; không hard-code UUID trong seed data. Seeder nên idempotent bằng cách kiểm tra unique key trước khi create hoặc update record hiện có.

Migration nên có khả năng chạy lại an toàn trong môi trường development, ví dụ sử dụng `CREATE TABLE IF NOT EXISTS`.

## 7. Docker Compose của service

Service Compose chỉ chứa application container. Không tạo thêm MySQL container:

```yaml
services:
  products-service:
    build:
      context: ..
      dockerfile: products-service/Dockerfile
    container_name: tumlumtala-products-service
    environment:
      PORT: ${PORT:-25053}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:3000}
      DB_HOST: tumlumtala-mysql
      DB_PORT: "3306"
      DB_USER: ${DB_USER:-tumlum}
      DB_PASSWORD: ${DB_PASSWORD:-tala}
      DB_NAME: ${DB_NAME:-tumlumtala_products}
    ports:
      - "${PORT:-25053}:${PORT:-25053}"
    networks:
      - tumlumtala-net

networks:
  tumlumtala-net:
    external: true
```

Mỗi service phải sử dụng port riêng.

### Quy ước port

Port được đăng ký tập trung trong Makefile root:

| Service | Port |
|---|---:|
| `users-service` | `25052` |
| `auth-service` | `25053` |
| `products-service` | `25054` |

Port TCP hợp lệ nằm trong khoảng `1-65535`. Khi thêm service mới, khai báo `<SERVICE>_SERVICE_PORT`, thêm vào `SERVICE_PORTS` và chạy kiểm tra:

```bash
make ports
make validate-ports
```

`make dev` tự chạy `validate-ports` và sẽ dừng nếu port bị trùng hoặc ngoài phạm vi.

## 8. Contract Makefile của service

Makefile root chỉ điều phối, vì vậy Makefile trong mỗi service phải cung cấp tối thiểu:

```text
make up
make start
make down
make migrate-up
make seed
make migrate-fresh-seeder
make test
make build
```

Ý nghĩa:

- `up`: ensure database, migrate, build và start service.
- `start`: ensure database, migrate và start service hiện có.
- `down`: stop application container, không xóa shared MySQL volume.
- `migrate-up`: ensure database rồi chạy `internal/infrastructure/db/migrations/*.sql` theo thứ tự.
- `seed`: chạy Go seeder entrypoint, ví dụ `go run ./cmd/seed`.
- `migrate-fresh-seeder`: chỉ recreate database của service rồi migrate và seed.
- `test`: chạy test của service.
- `build`: build application image.

Có thể copy `users-service/Makefile` làm mẫu, sau đó thay:

- `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`.
- Tên container service.
- Seeder command và các dependency usecase của service.

## 9. Nối service vào Makefile root

Ví dụ với `products-service`, bổ sung các target:

```makefile
.PHONY: start-product up-product down-product migrate-product migrate-fresh-seeder-product

up-product:
	@$(MAKE) -C products-service up

start-product:
	@$(MAKE) -C products-service start

down-product:
	@$(MAKE) -C products-service down

migrate-product:
	@$(MAKE) -C products-service migrate-up

migrate-fresh-seeder-product:
	@$(MAKE) -C products-service migrate-fresh-seeder
```

Sau đó thêm target tương ứng vào các dependency tổng:

```makefile
down: down-auth down-user down-product down-infra
up: network up-infra up-auth up-user up-product
start: start-infra start-auth start-user start-product
migrate-up: migrate-auth migrate-user migrate-product
migrate-fresh-seeder: migrate-fresh-seeder-auth migrate-fresh-seeder-user migrate-fresh-seeder-product
```

## 10. Các lệnh Makefile thường dùng

Chạy từ root `tumlumtala`:

```bash
make help
make dev
make down

make start-user
make migrate-user
make migrate-fresh-seeder-user

make migrate-up
make migrate-fresh-seeder

make proto
```

Chạy trực tiếp trong một service:

```bash
cd users-service
make help
make up
make test
make migrate-up
make seed
make migrate-fresh-seeder
```

Lưu ý: `make migrate-fresh-seeder*` làm mất dữ liệu trong database của service được chọn, chỉ sử dụng cho development/test.

## 11. Checklist trước khi hoàn tất service

- [ ] Database có tên `tumlumtala_<domain>`.
- [ ] Service không truy cập trực tiếp database của service khác.
- [ ] `.env.example` đầy đủ và `.env` được ignore.
- [ ] Port không trùng service hiện tại và nằm trong khoảng `1-65535`.
- [ ] Service không tự xác thực API key; policy này được thực hiện tại gateway.
- [ ] Domain/application không phụ thuộc GORM hoặc protobuf.
- [ ] Repository và query service có interface và implementation riêng.
- [ ] Migration/seeder chỉ tác động database của service.
- [ ] Docker Compose dùng `tumlumtala-net` và MySQL chung.
- [ ] Makefile service implement đầy đủ contract target.
- [ ] Makefile root đã nối target của service.
- [ ] `go test ./...`, `docker compose config` và Docker build đều thành công.
