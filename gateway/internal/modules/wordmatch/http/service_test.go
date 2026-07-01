package http

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewRoundUsesGroqWithoutDictionary(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/openai/v1/chat/completions" {
			t.Fatalf("unexpected Groq path: %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Fatal("missing Groq authorization header")
		}
		var request struct {
			Model          string            `json:"model"`
			ResponseFormat map[string]string `json:"response_format"`
		}
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if request.Model != "test-model" {
			t.Fatalf("unexpected model: %s", request.Model)
		}
		if request.ResponseFormat["type"] != "json_object" {
			t.Fatal("word round must request a JSON response")
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = fmt.Fprint(w, `{
			"choices": [{
				"message": {
					"content": "{\"baseWord\":\"âm\",\"correctWord\":\"âm nhạc\",\"decoys\":[\"âm vẹt\",\"âm rổ\",\"âm nón\",\"âm dép\",\"âm kéo\",\"âm mực\",\"âm chổi\",\"âm gạch\"]}"
				}
			}]
		}`)
	}))
	defer server.Close()

	service := newWordMatchService(server.URL+"/openai/v1", "test-key", "test-model")
	round, err := service.newRound(context.Background(), "ÂM")
	if err != nil {
		t.Fatalf("create round: %v", err)
	}
	if round.BaseWord != "âm" {
		t.Fatalf("unexpected base word: %s", round.BaseWord)
	}
	if len(round.Choices) != totalChoices {
		t.Fatalf("expected %d choices, got %d", totalChoices, len(round.Choices))
	}
	if len(round.CorrectWords) != 1 || round.CorrectWords[0] != "âm nhạc" {
		t.Fatalf("unexpected correct words: %+v", round.CorrectWords)
	}
}

func TestBuildRoundRejectsInvalidGroqOutput(t *testing.T) {
	_, err := buildRound(generatedRound{
		BaseWord:    "âm",
		CorrectWord: "âm nhạc",
		Decoys:      []string{"âm vẹt"},
	}, "")
	if err == nil {
		t.Fatal("expected round with fewer than eight decoys to be rejected")
	}
}
