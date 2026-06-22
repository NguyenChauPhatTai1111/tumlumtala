package usecase

import "context"

type DLQReplayer interface {
	ReplayDLQ(ctx context.Context, limit int) (int, error)
}

type ReplayDLQUseCase struct {
	replayer DLQReplayer
}

func NewReplayDLQUseCase(replayer DLQReplayer) *ReplayDLQUseCase {
	return &ReplayDLQUseCase{replayer: replayer}
}

func (uc *ReplayDLQUseCase) Execute(ctx context.Context, limit int) (int, error) {
	return uc.replayer.ReplayDLQ(ctx, limit)
}
