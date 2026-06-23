package topics

const (
	UserCreated = "user.created"
	UserUpdated = "user.updated"
	UserDeleted = "user.deleted"

	// UserUpserted is published by cmd/replay for bulk re-sync.
	// Semantics: "ensure this user exists with these values" — idempotent,
	// safe to publish multiple times. Consumers handle it with INSERT ... ON DUPLICATE KEY UPDATE.
	// Using a distinct topic avoids polluting user.created with replay noise
	// and lets services subscribe selectively.
	UserUpserted = "user.upserted"

	// DLQ topics — messages land here after max retries exceeded.
	UserCreatedDLQ  = "user.created.dlq"
	UserUpdatedDLQ  = "user.updated.dlq"
	UserDeletedDLQ  = "user.deleted.dlq"
	UserUpsertedDLQ = "user.upserted.dlq"
)

// DLQTopic returns the DLQ topic for a given source topic.
func DLQTopic(source string) string {
	return source + ".dlq"
}
