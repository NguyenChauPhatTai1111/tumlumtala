package http

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLexiconRejectsConversationalFragments(t *testing.T) {
	directory := t.TempDir()
	if err := os.WriteFile(
		filepath.Join(directory, "a.txt"),
		[]byte("âm nhạc\ndo dự\ngia đình\n"),
		0o600,
	); err != nil {
		t.Fatalf("write test dictionary: %v", err)
	}
	validator, err := newLexiconValidator(
		directory,
		fakeValidator{result: validationResult{Valid: true}},
	)
	if err != nil {
		t.Fatalf("load lexicon: %v", err)
	}

	for _, phrase := range []string{"sao hả", "sao mà", "sao chăng", "vậy hả"} {
		result, validateErr := validator.validateAndExplain(context.Background(), phrase)
		if validateErr != nil {
			t.Fatalf("validate %q: %v", phrase, validateErr)
		}
		if result.Valid || !strings.Contains(result.Explanation, "không có trong từ điển") {
			t.Fatalf("expected %q to be rejected, got %+v", phrase, result)
		}
	}

	result, err := validator.validateAndExplain(context.Background(), "ÂM   NHẠC")
	if err != nil || !result.Valid {
		t.Fatalf("expected normalized dictionary word to pass: result=%+v err=%v", result, err)
	}
	result, err = validator.validateAndExplain(context.Background(), "gia đình")
	if err != nil || !result.Valid {
		t.Fatalf("expected gia đình to pass the dictionary: result=%+v err=%v", result, err)
	}
}
