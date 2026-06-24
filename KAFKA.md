# Kafka — Hướng dẫn vận hành & mở rộng

## Kiến trúc tổng quan

```
Owner service          Kafka topic          Consumer service
──────────────         ───────────          ────────────────
users-service  ──▶  user.created    ──▶  messenger-service  (user_snapshots)
               ──▶  user.updated    ──▶  movies-service     (user_snapshots)
               ──▶  user.deleted
               ──▶  user.upserted   ──▶  (replay bulk sync, idempotent)
```

Mỗi message được bọc trong `Envelope` (xem `kafka-service/envelope/envelope.go`):

- `event_id` — UUID duy nhất, dùng để dedup
- `topic`, `attempt`, `published_at`
- `payload` — JSON của event cụ thể

Khi consumer thất bại vượt `MaxRetries`, message được route sang topic `.dlq`
(ví dụ `user.created.dlq`) để debug thủ công.

---

## Cấu trúc thư mục migration

Mỗi service consumer tách migration thành 2 thư mục:

```
<service>/internal/infrastructure/db/migrations/
  main/       — bảng chính (messages, movies, …)
  snapshots/  — bảng snapshot từ service khác
```

Quy tắc đặt tên file: `NNN_<mô_tả>.sql`, bắt đầu lại từ `001` trong mỗi thư mục.
Tất cả index phải nằm **inline** trong `CREATE TABLE IF NOT EXISTS` — không dùng
`CREATE INDEX` độc lập vì MySQL không hỗ trợ `IF NOT EXISTS` cho lệnh đó.

---

## Makefile flow (4 phase)

```
make migrate-all
```

Chạy lần lượt:

| Phase | Make target         | Nội dung                                         |
| ----- | ------------------- | ------------------------------------------------ |
| 1     | `migrate-main`      | Tạo bảng chính: users, movies, messages, auth, … |
| 2     | `seed-main`         | Seed dữ liệu chính                               |
| 3     | `migrate-snapshots` | Tạo bảng snapshot trong các consumer service     |
| 4     | `replay-snapshots`  | Publish `user.upserted` → consumer tự sync       |

Có thể chạy từng phase riêng:

```bash
make migrate-main        # chỉ phase 1
make migrate-snapshots   # chỉ phase 3
make replay              # chỉ phase 4 (alias của replay-snapshots)
```

---

## Thêm snapshot mới — từng bước

Ví dụ: thêm `movie_snapshots` vào `messenger-service`
(messenger cần biết thông tin phim để hiển thị preview khi share link).

### Bước 1 — Định nghĩa Kafka topic

File: `kafka-service/topics/topics.go`

```go
const (
    // ... topics hiện có ...
    MovieCreated = "movie.created"
    MovieUpdated = "movie.updated"
    MovieDeleted = "movie.deleted"
    MovieUpserted = "movie.upserted"          // dùng cho replay

    MovieCreatedDLQ  = "movie.created.dlq"
    MovieUpdatedDLQ  = "movie.updated.dlq"
    MovieDeletedDLQ  = "movie.deleted.dlq"
    MovieUpsertedDLQ = "movie.upserted.dlq"
)
```

### Bước 2 — Định nghĩa event contract

File: `contracts/events/movie_events.go`

```go
package events

type MovieCreatedEvent struct {
    ID    uint64 `json:"id"`
    UUID  string `json:"uuid"`
    Title string `json:"title"`
    // ... các field cần thiết
}

type MovieUpsertedEvent struct {
    ID    uint64 `json:"id"`
    UUID  string `json:"uuid"`
    Title string `json:"title"`
}
```

### Bước 3 — Tạo SQL migration trong consumer service

File: `messenger-service/internal/infrastructure/db/migrations/snapshots/003_create_movie_snapshots.sql`

```sql
CREATE TABLE IF NOT EXISTS movie_snapshots (
    id         BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    uuid       CHAR(36)        NOT NULL,
    title      VARCHAR(500)    NOT NULL DEFAULT '',
    created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_movie_snapshots_uuid (uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Lưu ý: index phải inline trong CREATE TABLE, không dùng `CREATE INDEX` riêng.

### Bước 4 — Viết SnapshotStore và consumer trong consumer service

File: `messenger-service/internal/infrastructure/kafka/movie_snapshot_store.go`

```go
type MovieSnapshotStore interface {
    Upsert(ctx context.Context, id uint64, uuid, title string, now time.Time) error
    Delete(ctx context.Context, id uint64) error
}
```

File: `messenger-service/internal/infrastructure/kafka/movie_snapshot_consumer.go`

```go
func (c *MovieSnapshotConsumer) Run(ctx context.Context) {
    // subscribe topics.MovieCreated, topics.MovieUpdated, topics.MovieUpserted, topics.MovieDeleted
}
```

### Bước 5 — Tạo Kafka topics (một lần)

```bash
docker exec tumlumtala-kafka rpk topic create \
    movie.created movie.updated movie.deleted movie.upserted \
    movie.created.dlq movie.updated.dlq movie.deleted.dlq movie.upserted.dlq \
    --partitions 1 --replicas 1
```

Hoặc thêm vào `infra/docker-compose.yml` trong service `kafka-init`:

```yaml
kafka-init:
    command:
        - |
            rpk topic create \
              user.created user.updated user.deleted user.upserted \
              user.created.dlq user.updated.dlq user.deleted.dlq user.upserted.dlq \
              movie.created movie.updated movie.deleted movie.upserted \
              movie.created.dlq movie.updated.dlq movie.deleted.dlq movie.upserted.dlq \
              --brokers tumlumtala-kafka:9092 \
              --partitions 1 --replicas 1 2>&1 | grep -v "TOPIC_ALREADY_EXISTS" || true
```

### Bước 6 — Thêm migrate-snapshots target vào Makefile consumer service

File: `messenger-service/Makefile` — không cần thêm gì, `migrate-snapshots` đã
scan toàn bộ file trong `migrations/snapshots/`.

### Bước 7 — Thêm publisher trong owner service

File: `movies-service/internal/infrastructure/kafka/event_publisher.go`

```go
func (p *EventPublisher) PublishMovieUpserted(ctx context.Context, movieUUID string, ev events.MovieUpsertedEvent) error {
    return p.publish(ctx, topics.MovieUpserted, movieUUID, ev)
}
```

### Bước 8 — Tạo cmd/replay tương đương trong owner service

Hoặc thêm vào `movies-service/cmd/replay/main.go` tương tự
`users-service/cmd/replay/main.go` — publish `movie.upserted` cho toàn bộ movies,
consumer service sẽ sync `movie_snapshots`.

### Bước 9 — Đăng ký target replay trong root Makefile

File: `Makefile`

```makefile
# Phase 3: thêm messenger migrate movie snapshots
migrate-snapshots: migrate-messenger-snapshots migrate-movie-snapshots migrate-messenger-movie-snapshots

migrate-messenger-movie-snapshots:
    $(MAKE) -C messenger-service migrate-snapshots

# Phase 4: thêm replay movies
replay-snapshots: replay-user-snapshots replay-movie-snapshots

replay-movie-snapshots:
    $(MAKE) -C movies-service replay
```

### Bước 10 — Viết unit test cho consumer mới

File: `messenger-service/internal/infrastructure/kafka/movie_snapshot_consumer_test.go`

Dùng pattern stub như `user_snapshot_consumer_test.go`:

- `movieSnapshotStoreStub` implement `MovieSnapshotStore`
- Test: MovieCreatedEvent, MovieUpdatedEvent, MovieUpsertedEvent, InvalidPayload, StoreError

---

## Checklist khi thêm snapshot mới

```
[ ] kafka-service/topics/topics.go         — thêm topic constants + DLQ
[ ] contracts/events/<entity>_events.go    — định nghĩa event structs
[ ] <consumer>/migrations/snapshots/       — tạo SQL migration (index inline)
[ ] <consumer>/infrastructure/kafka/       — SnapshotStore + consumer handler
[ ] <owner>/infrastructure/kafka/          — PublishXxxUpserted()
[ ] <owner>/cmd/replay/                    — publish upserted events
[ ] infra/docker-compose.yml (kafka-init)  — thêm topic mới vào rpk create
[ ] root Makefile                          — thêm migrate + replay target nếu cần
[ ] unit tests                             — cover Created, Updated, Upserted, Delete, InvalidPayload, StoreError
```

---

## Kafka topics hiện tại

| Topic           | Publisher              | Consumer          | Mô tả                    |
| --------------- | ---------------------- | ----------------- | ------------------------ |
| `user.created`  | users-service          | messenger, movies | User mới đăng ký         |
| `user.updated`  | users-service          | messenger, movies | User cập nhật profile    |
| `user.deleted`  | users-service          | messenger, movies | User bị xoá              |
| `user.upserted` | users-service (replay) | messenger, movies | Bulk re-sync, idempotent |
| `user.*.dlq`    | consumer (on failure)  | —                 | Dead letter queue        |

---

## Lệnh vận hành thường dùng

```bash
# Xem danh sách topics
docker exec tumlumtala-kafka rpk topic list

# Xem messages trong topic (debug)
docker exec tumlumtala-kafka rpk topic consume user.upserted --num 5

# Xem messages DLQ
docker exec tumlumtala-kafka rpk topic consume user.created.dlq --num 10

# Tạo topic thủ công
docker exec tumlumtala-kafka rpk topic create <topic-name> --partitions 1 --replicas 1

# Sync lại toàn bộ user_snapshots (idempotent)
make replay

# Sync sau khi thêm service mới (chạy migration trước)
make migrate-snapshots
make replay
```
