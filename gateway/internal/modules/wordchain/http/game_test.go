package http

import (
	"context"
	"testing"
	"time"
)

type fakeValidator struct {
	result validationResult
	err    error
}

func (f fakeValidator) validateAndExplain(context.Context, string) (validationResult, error) {
	return f.result, f.err
}

func TestRoomCapacityAndPassword(t *testing.T) {
	hub := newHub(fakeValidator{}, nil)
	created, err := hub.createRoom(
		"host", "Chủ phòng", "Phòng thử", "1234", 6, modeTraditional,
	)
	if err != nil {
		t.Fatalf("create room: %v", err)
	}
	if created.Chain == nil {
		t.Fatal("expected an empty chain array, got nil")
	}
	if _, err := hub.joinRoom("guest", "Khách", created.ID, "sai"); err == nil {
		t.Fatal("expected wrong password to be rejected")
	}
	if _, err := hub.joinRoom("guest", "Khách", created.ID, "1234"); err != nil {
		t.Fatalf("join room: %v", err)
	}
	if _, err := hub.joinRoom("third", "Người thứ ba", created.ID, "1234"); err != nil {
		t.Fatalf("join third player: %v", err)
	}
	if _, err := hub.joinRoom("fourth", "Người thứ tư", created.ID, "1234"); err != nil {
		t.Fatalf("join fourth player: %v", err)
	}
	if _, err := hub.joinRoom("fifth", "Người thứ năm", created.ID, "1234"); err != nil {
		t.Fatalf("join fifth player: %v", err)
	}
	if _, err := hub.joinRoom("sixth", "Người thứ sáu", created.ID, "1234"); err != nil {
		t.Fatalf("join sixth player: %v", err)
	}
	if _, err := hub.joinRoom("seventh", "Người thứ bảy", created.ID, "1234"); err == nil {
		t.Fatal("expected seventh player to be rejected")
	}
	state, err := hub.roomState("host", created.ID)
	if err != nil {
		t.Fatalf("get room: %v", err)
	}
	for index, expectedID := range []string{"host", "guest", "third", "fourth", "fifth", "sixth"} {
		if state.Players[index].ID != expectedID || state.Players[index].Order != index+1 {
			t.Fatalf("unexpected player order at %d: %+v", index, state.Players[index])
		}
	}
}

func TestTwoPlayerRoomAlwaysUsesTraditionalMode(t *testing.T) {
	hub := newHub(fakeValidator{}, nil)
	created, err := hub.createRoom(
		"host", "Chủ phòng", "Phòng đôi", "", 2, modeBrawl,
	)
	if err != nil {
		t.Fatalf("create room: %v", err)
	}
	if created.GameMode != modeTraditional {
		t.Fatalf("expected traditional mode, got %q", created.GameMode)
	}
}

func TestValidWordChangesTurnAndAddsScore(t *testing.T) {
	hub := newHub(fakeValidator{result: validationResult{
		Valid: true, Normalized: "âm nhạc", Explanation: "Nghệ thuật tổ chức âm thanh.",
	}}, nil)
	created, err := hub.createRoom(
		"host", "Chủ phòng", "Đấu trường", "", 2, modeTraditional,
	)
	if err != nil {
		t.Fatalf("create room: %v", err)
	}
	if _, err := hub.joinRoom("guest", "Khách", created.ID, ""); err != nil {
		t.Fatalf("join room: %v", err)
	}

	hub.mu.Lock()
	hub.rooms[created.ID].Players["host"].Connected = true
	hub.rooms[created.ID].Players["guest"].Connected = true
	hub.mu.Unlock()
	hub.startGame(created.ID, "host")
	started, err := hub.roomState("host", created.ID)
	if err != nil {
		t.Fatalf("get started room: %v", err)
	}
	if started.RemainingMs < 14_000 || started.RemainingMs > 15_000 {
		t.Fatalf("expected a 15 second turn, got %dms", started.RemainingMs)
	}
	if started.RequiredSyllable == "" {
		t.Fatal("expected a random starting syllable")
	}
	hub.mu.Lock()
	hub.rooms[created.ID].RequiredSyllable = "âm"
	hub.mu.Unlock()
	hub.submitWord(created.ID, "host", "nhạc")

	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		state, stateErr := hub.roomState("host", created.ID)
		if stateErr == nil && len(state.Chain) == 1 {
			if state.TurnUserID != "guest" {
				t.Fatalf("expected guest turn, got %q", state.TurnUserID)
			}
			if state.Players[0].GameScore != 1 {
				t.Fatalf("expected host score 1, got %d", state.Players[0].GameScore)
			}
			if state.Players[0].GamePoints < 90 || state.Players[0].GamePoints > 100 {
				t.Fatalf("expected fast-answer points, got %d", state.Players[0].GamePoints)
			}
			if state.RequiredSyllable != "nhạc" {
				t.Fatalf("expected required syllable nhạc, got %q", state.RequiredSyllable)
			}
			if state.RemainingMs < 14_000 || state.RemainingMs > 15_000 {
				t.Fatalf("expected timer to reset for next turn, got %dms", state.RemainingMs)
			}
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("word validation did not complete")
}

func TestCalculateWordPointsRewardsFasterAnswers(t *testing.T) {
	start := time.Now()
	deadline := start.Add(turnDuration)
	fast := calculateWordPoints(deadline, start.Add(time.Second))
	slow := calculateWordPoints(deadline, start.Add(14*time.Second))
	if fast <= slow {
		t.Fatalf("expected fast score %d to exceed slow score %d", fast, slow)
	}
	if fast > 100 || slow < 10 {
		t.Fatalf("points outside expected range: fast=%d slow=%d", fast, slow)
	}
}

func TestFourPlayerTurnsRotateAndTimeoutEliminates(t *testing.T) {
	hub := newHub(fakeValidator{}, nil)
	created, err := hub.createRoom(
		"host", "Chủ phòng", "Bốn góc", "", 4, modeTraditional,
	)
	if err != nil {
		t.Fatalf("create room: %v", err)
	}
	for _, joined := range []struct{ id, name string }{
		{"second", "Người 2"},
		{"third", "Người 3"},
		{"fourth", "Người 4"},
	} {
		if _, err := hub.joinRoom(joined.id, joined.name, created.ID, ""); err != nil {
			t.Fatalf("join %s: %v", joined.id, err)
		}
	}
	hub.mu.Lock()
	for _, p := range hub.rooms[created.ID].Players {
		p.Connected = true
	}
	hub.mu.Unlock()
	hub.startGame(created.ID, "host")

	hub.mu.Lock()
	r := hub.rooms[created.ID]
	hub.eliminatePlayerLocked(r, "host", "timeout")
	firstState := viewOf(r)
	hub.mu.Unlock()
	if firstState.Status != "playing" || firstState.TurnUserID != "second" {
		t.Fatalf("expected player 2 turn after host timeout: %+v", firstState)
	}
	if !firstState.Players[0].Eliminated {
		t.Fatal("expected host to be eliminated")
	}

	hub.mu.Lock()
	hub.eliminatePlayerLocked(r, "second", "timeout")
	hub.eliminatePlayerLocked(r, "third", "timeout")
	finalState := viewOf(r)
	hub.mu.Unlock()
	if finalState.Status != "finished" || finalState.WinnerID != "fourth" {
		t.Fatalf("expected fourth player to win: %+v", finalState)
	}
}

func TestBrawlWinnerCanAnswerNextRoundAndNoAnswerRanksByPoints(t *testing.T) {
	hub := newHub(fakeValidator{result: validationResult{
		Valid: true, Normalized: "âm nhạc", Explanation: "Nghệ thuật tổ chức âm thanh.",
	}}, nil)
	created, err := hub.createRoom(
		"host", "Chủ phòng", "Sáp lá cà", "", 3, modeBrawl,
	)
	if err != nil {
		t.Fatalf("create room: %v", err)
	}
	for _, joined := range []struct{ id, name string }{
		{"second", "Người 2"},
		{"third", "Người 3"},
	} {
		if _, err := hub.joinRoom(joined.id, joined.name, created.ID, ""); err != nil {
			t.Fatalf("join %s: %v", joined.id, err)
		}
	}
	hub.mu.Lock()
	for _, p := range hub.rooms[created.ID].Players {
		p.Connected = true
	}
	hub.mu.Unlock()
	hub.startGame(created.ID, "host")
	hub.mu.Lock()
	hub.rooms[created.ID].RequiredSyllable = "âm"
	hub.mu.Unlock()

	hub.submitWord(created.ID, "second", "nhạc")
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		state, stateErr := hub.roomState("host", created.ID)
		if stateErr == nil && len(state.Chain) == 1 {
			if state.TurnUserID != "" {
				t.Fatalf("brawl must not assign a single turn owner: %+v", state)
			}
			hub.submitWord(created.ID, "second", "cụ")
			nextDeadline := time.Now().Add(time.Second)
			for time.Now().Before(nextDeadline) {
				nextState, _ := hub.roomState("host", created.ID)
				if len(nextState.Chain) == 2 {
					break
				}
				time.Sleep(10 * time.Millisecond)
			}
			answeredAgain, _ := hub.roomState("host", created.ID)
			if len(answeredAgain.Chain) != 2 || answeredAgain.Players[1].GameScore != 2 {
				t.Fatal("previous round winner must be allowed to score again immediately")
			}

			hub.mu.Lock()
			r := hub.rooms[created.ID]
			hub.finishBrawlLocked(r, "no_answer")
			finished := viewOf(r)
			hub.mu.Unlock()
			if finished.Status != "finished" || finished.WinnerID != "second" {
				t.Fatalf("expected points leader to win: %+v", finished)
			}
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("brawl validation did not complete")
}
