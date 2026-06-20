# Testing Guide — users-service

## Chạy test

Từ **root của monorepo** (`tumlumtala/`):

```bash
# Chạy toàn bộ test của một service
make test users-service

# Chạy chỉ một file test cụ thể
make test users-service get_user_test
make test users-service create_user_test
make test users-service list_users_test
make test users-service update_user_test
make test users-service delete_user_test
```

Từ **thư mục service** (`users-service/`):

```bash
# Chạy toàn bộ test
go test ./...

# Chạy với verbose output
go test -v ./...

# Chạy một package cụ thể
go test ./internal/adapter/grpc/...
go test ./internal/application/usecase/testcase/...

# Chạy một test function cụ thể
go test -run TestGetUser ./internal/application/usecase/testcase/...
```

Hoặc dùng Makefile của service:

```bash
make test
```

---

## Cấu trúc test

```
users-service/
└── internal/
    ├── adapter/grpc/
    │   ├── controller.go
    │   └── controller_test.go              # test gRPC controller (cùng package)
    └── application/usecase/
        ├── create_user.go
        ├── get_user.go
        ├── list_users.go
        ├── update_user.go
        ├── delete_user.go
        └── testcase/                       # thư mục chứa toàn bộ usecase tests
            ├── helpers_test.go             # shared stubs và factories
            ├── create_user_test.go
            ├── get_user_test.go
            ├── list_users_test.go
            ├── update_user_test.go
            └── delete_user_test.go
```

Quy tắc:
- **Controller test**: nằm cùng package với `controller.go` (`package grpc`).
- **Usecase tests**: nằm trong `testcase/` dưới dạng external test package (`package testcase`).

---

## Triết lý testing

Project không dùng thư viện mock bên ngoài. Tất cả test double được viết thủ công dưới dạng **stub**.

### Tại sao dùng stub thay vì mock?

- **Stub** trả về dữ liệu cố định, không kiểm tra xem method có được gọi hay không.
- **Mock** kiểm tra cả hành vi gọi (số lần gọi, tham số...) — dễ gây test brittle.
- Stub đơn giản hơn, dễ đọc hơn, và đủ cho layer use case / controller.

---

## Các lớp test

### 1. Use Case Tests (`application/usecase/`)

Test logic nghiệp vụ thuần túy — không có DB, không có gRPC.

**Pattern dùng trong project:**

```go
// Stub implement cả repository và query service
type userStoreStub struct{ created *entity.User }

func (s *userStoreStub) Create(_ context.Context, user *entity.User) error {
    s.created = user
    return nil
}
// ... các method khác

func TestCreateUserHashesPassword(t *testing.T) {
    store := &userStoreStub{}
    result, err := NewCreateUserUseCase(store, store).Execute(...)
    if err != nil {
        t.Fatal(err)
    }
    // assertions...
}
```

**Các stub có sẵn:**

| Stub | File | Dùng cho |
|------|------|---------|
| `userStoreStub` | `create_user_test.go` | CreateUser, UpdateUser, DeleteUser |
| `queryStub` | `get_user_test.go` | GetUser, ListUsers, UpdateUser |

**Khi thêm use case mới**, tạo file `<tên>_test.go` trong cùng package và dùng lại các stub trên nếu phù hợp.

---

### 2. Controller Tests (`adapter/grpc/`)

Test mapping giữa gRPC request/response và use case — bao gồm cả error mapping sang gRPC status code.

**Pattern:**

```go
// controllerStore implement cả repository lẫn query service trong một struct
func newController(users ...*entity.User) *UserController {
    store := newControllerStore(users...)
    return NewUserController(
        usecase.NewCreateUserUseCase(store, store),
        usecase.NewGetUserUseCase(store),
        // ...
    )
}

func TestControllerCreateUser(t *testing.T) {
    c := newController()  // khởi tạo không có user nào
    resp, err := c.CreateUser(context.Background(), &userpb.CreateUserRequest{...})
    // assertions...
}
```

**Kiểm tra gRPC error code:**

```go
import "google.golang.org/grpc/status"

if code := status.Code(err); code != grpcCodes.NotFound {
    t.Fatalf("grpc code = %v, want NotFound", code)
}
```

**Bảng mapping lỗi:**

| Domain error | gRPC code |
|---|---|
| `ErrInvalidInput` | `InvalidArgument` (400) |
| `ErrNotFound` | `NotFound` (404) |
| `ErrEmailExists` | `AlreadyExists` (409) |
| Lỗi khác | `Internal` (500) |

---

## Thêm test cho service mới

Khi xây dựng service mới (ví dụ: `auth-service`), áp dụng cùng pattern:

1. **Use case test**: Tạo stub implement các interface (`repository`, `queryservice`) → test từng use case.
2. **Controller test**: Tạo một struct implement tất cả interface → wire use case thật → test gRPC request/response.
3. **Đặt file**: `controller_test.go` nằm cùng thư mục với `controller.go`.

---

## Không có trong test suite hiện tại

Các test sau **không** được include vì cần DB/network thật:

- Integration test với MySQL (persistence layer)
- End-to-end test qua gRPC network
- Migration test

Để test persistence layer, cần khởi chạy database (xem `docker-compose.yml` trong `deploy/`).
