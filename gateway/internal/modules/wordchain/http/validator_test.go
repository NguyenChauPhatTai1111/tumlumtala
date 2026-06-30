package http

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGroqValidatorAppendsChatCompletionsToBaseURL(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/openai/v1/chat/completions" {
			t.Fatalf("unexpected Groq path: %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Fatal("missing Groq authorization header")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = fmt.Fprint(w, `{
			"choices": [{
				"message": {
					"content": "{\"valid\":true,\"normalized\":\"âm nhạc\",\"explanation\":\"Nghệ thuật tổ chức âm thanh.\"}"
				}
			}]
		}`)
	}))
	defer server.Close()

	validator := newGroqValidator(server.URL+"/openai/v1", "test-key", "test-model")
	result, err := validator.validateAndExplain(context.Background(), "âm nhạc")
	if err != nil {
		t.Fatalf("validate phrase: %v", err)
	}
	if !result.Valid || result.Normalized != "âm nhạc" {
		t.Fatalf("unexpected validation result: %+v", result)
	}
}
