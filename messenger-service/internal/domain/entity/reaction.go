package entity

type MessageReaction struct {
	UserID uint   `json:"user_id"`
	Emoji  string `json:"emoji"`
}
