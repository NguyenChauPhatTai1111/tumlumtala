# users-service

Microservice gRPC dùng GORM với MySQL để quản lý user qua các thao tác Create, Get, List, Update và Delete. Password được băm bằng bcrypt và không bao giờ trả về qua API.

User có một trong ba role: `administrator`, `manager`, `member`. Khi tạo user mà không truyền role, service mặc định dùng `member`.

Database dùng `id BIGINT UNSIGNED AUTO_INCREMENT` làm khóa nội bộ và `uuid CHAR(36) UNIQUE` làm định danh public qua API.

## Chạy bằng Docker

Từ thư mục `users-service`:

```bash
cp .env.example .env
docker compose up --build
```

Hoặc dùng Makefile của service:

```bash
make up
make migrate-up
make migrate-fresh-seeder # recreate tumlumtala_users và chạy Go UserSeeder
```

Service lắng nghe tại `localhost:25052`. MySQL dùng chung của hệ thống được expose tại `localhost:23306`; users-service chỉ sở hữu database `tumlumtala_users` và migration/seeder của database này.

## Cấu hình environment

- `PORT`: cổng gRPC, mặc định `25052`.
- `CORS_ORIGIN`: origin được phép cho HTTP/gRPC-Web gateway, mặc định `http://localhost:3000`. Native gRPC không áp dụng CORS.
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: cấu hình MySQL; database mặc định là `tumlumtala_users`.
- `MYSQL_HOST_PORT`: cổng MySQL expose trên máy host khi chạy Docker.

Ứng dụng tự đọc `.env`; environment variables của hệ điều hành luôn được ưu tiên. Không commit `.env`, chỉ commit `.env.example`.

## Kiến trúc

Service dùng module-oriented clean architecture tương tự backend `movie`:

```text
internal/
├── adapter/grpc/                    # gRPC controller và response mapping
├── application/
│   ├── dto/                         # input/output models
│   ├── queryservice/                # read-side interface
│   └── usecase/                     # từng CRUD business use case
├── bootstrap/                       # dependency wiring
├── config/                          # environment configuration
├── domain/
│   ├── entity/                      # User aggregate
│   ├── errors/                      # domain errors
│   └── repository/                  # write-side interface
└── infrastructure/
    ├── db/                          # Connection, migrations và Go seeders
    └── persistence/
        ├── model/                   # GORM persistence models và domain mapper
        ├── queryservice/            # MySQL read implementation
        └── repository/              # MySQL write implementation
```

Controller chỉ gọi use case; use case chỉ phụ thuộc các interface trong application/domain. MySQL implementation được inject tại composition root, nên có thể thay database hoặc mock trong test mà không sửa business logic.

## RPC

- `CreateUser`: email, password (tối thiểu 6 ký tự), fullname, role (mặc định `member`).
- `GetUser`: uuid.
- `ListUsers`: limit (mặc định 20, tối đa 100), offset.
- `UpdateUser`: uuid, email, fullname, role (để trống sẽ giữ role hiện tại).
- `DeleteUser`: uuid.

Sau khi sửa file proto, chạy `make proto` ở thư mục gốc để sinh lại Go contracts.
