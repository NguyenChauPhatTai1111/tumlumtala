package http

import (
	"bufio"
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

const totalChoices = 9

type WordMatchRound struct {
	BaseWord     string   `json:"baseWord"`
	Choices      []string `json:"choices"`
	CorrectWords []string `json:"correctWords"` // always has exactly 1 correct answer now
}

type wordMatchService struct {
	dictDir   string
	llmURL    string
	llmKey    string
	llmModel  string
	allWords  []string
	once      sync.Once
}

func newWordMatchService(dictDir, llmURL, llmKey, llmModel string) *wordMatchService {
	return &wordMatchService{
		dictDir:  dictDir,
		llmURL:   llmURL,
		llmKey:   llmKey,
		llmModel: llmModel,
	}
}

// newRound generates a round. If baseWord is provided, uses it as the starting syllable.
// Otherwise picks a random one. Always has exactly 1 correct answer.
func (s *wordMatchService) newRound(ctx context.Context, baseWord string) (WordMatchRound, error) {
	all, err := s.loadWords()
	if err != nil {
		return WordMatchRound{}, fmt.Errorf("không tải được từ điển: %w", err)
	}

	base := strings.TrimSpace(baseWord)
	if base == "" {
		base, err = s.pickBase(all)
		if err != nil {
			return WordMatchRound{}, err
		}
	}

	valid := wordsStartingWith(all, base)
	if len(valid) == 0 {
		// Fallback: pick a new random base if the provided one has no matches
		base, err = s.pickBase(all)
		if err != nil {
			return WordMatchRound{}, err
		}
		valid = wordsStartingWith(all, base)
	}

	// Pick exactly 1 correct answer randomly from valid words.
	// Decoys are guaranteed NOT to be real words (checked against full dictionary).
	correct, err := sampleN(valid, 1)
	if err != nil {
		return WordMatchRound{}, err
	}

	decoys, err := s.buildDecoys(base, valid, all, totalChoices-1)
	if err != nil {
		return WordMatchRound{}, err
	}

	choices := append(append([]string{}, correct...), decoys...)
	if err := shuffle(choices); err != nil {
		return WordMatchRound{}, err
	}

	return WordMatchRound{
		BaseWord:     base,
		Choices:      choices,
		CorrectWords: correct,
	}, nil
}

func (s *wordMatchService) explain(ctx context.Context, words []string) (string, error) {
	if s.llmURL == "" || len(words) == 0 {
		return "Không có dịch vụ giải thích từ.", nil
	}

	list := strings.Join(words, ", ")
	prompt := fmt.Sprintf(
		"Giải thích ngắn gọn nghĩa của các từ tiếng Việt sau (mỗi từ một dòng, format: từ - nghĩa): %s",
		list,
	)

	type msg struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	type reqBody struct {
		Model     string  `json:"model"`
		Messages  []msg   `json:"messages"`
		MaxTokens int     `json:"max_tokens"`
		Temp      float32 `json:"temperature"`
	}
	body, _ := json.Marshal(reqBody{
		Model: s.llmModel,
		Messages: []msg{
			{Role: "system", Content: "Bạn là từ điển tiếng Việt. Giải thích từ ngắn gọn, chính xác."},
			{Role: "user", Content: prompt},
		},
		MaxTokens: 512,
		Temp:      0.3,
	})

	endpoint := strings.TrimRight(s.llmURL, "/")
	if !strings.HasSuffix(endpoint, "/chat/completions") {
		if strings.HasSuffix(endpoint, "/v1") {
			endpoint += "/chat/completions"
		} else {
			endpoint += "/v1/chat/completions"
		}
	}

	reqCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "Không thể kết nối dịch vụ giải thích.", nil
	}
	req.Header.Set("Content-Type", "application/json")
	if s.llmKey != "" {
		req.Header.Set("Authorization", "Bearer "+s.llmKey)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "Không thể lấy giải thích lúc này.", nil
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(raw, &out); err != nil || len(out.Choices) == 0 {
		return "Không thể phân tích kết quả giải thích.", nil
	}
	return strings.TrimSpace(out.Choices[0].Message.Content), nil
}

func (s *wordMatchService) loadWords() ([]string, error) {
	var loadErr error
	s.once.Do(func() {
		s.allWords, loadErr = readWordsFromDir(s.dictDir)
	})
	return s.allWords, loadErr
}

func readWordsFromDir(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var words []string
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".txt") {
			continue
		}
		f, err := os.Open(filepath.Join(dir, e.Name()))
		if err != nil {
			continue
		}
		sc := bufio.NewScanner(f)
		for sc.Scan() {
			line := strings.TrimSpace(sc.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			words = append(words, normalizeWord(line))
		}
		f.Close()
	}
	return words, nil
}

func normalizeWord(w string) string {
	return strings.ToLower(strings.TrimSpace(w))
}

func (s *wordMatchService) pickBase(all []string) (string, error) {
	seen := map[string]struct{}{}
	var syllables []string
	for _, w := range all {
		parts := strings.Fields(w)
		if len(parts) < 2 {
			continue
		}
		if _, ok := seen[parts[0]]; !ok {
			seen[parts[0]] = struct{}{}
			syllables = append(syllables, parts[0])
		}
	}
	if len(syllables) == 0 {
		return "", fmt.Errorf("không tìm thấy âm tiết phù hợp")
	}
	for attempt := 0; attempt < 100; attempt++ {
		idx, err := randN(int64(len(syllables)))
		if err != nil {
			return "", err
		}
		candidate := syllables[idx]
		if len(wordsStartingWith(all, candidate)) >= 1 {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("không tìm được từ gốc sau nhiều lần thử")
}

func wordsStartingWith(all []string, base string) []string {
	prefix := base + " "
	var out []string
	for _, w := range all {
		if strings.HasPrefix(w, prefix) {
			out = append(out, w)
		}
	}
	return out
}

func (s *wordMatchService) buildDecoys(base string, valid []string, all []string, n int) ([]string, error) {
	// allWordsSet: every word in dictionary — decoys must NOT be in here
	allWordsSet := make(map[string]struct{}, len(all))
	for _, w := range all {
		allWordsSet[w] = struct{}{}
	}

	// Collect second syllables that don't form a real word with base
	secondPool := map[string]struct{}{}
	for _, w := range all {
		parts := strings.Fields(w)
		if len(parts) >= 2 {
			candidate := base + " " + parts[1]
			if _, real := allWordsSet[candidate]; !real {
				secondPool[parts[1]] = struct{}{}
			}
		}
	}

	pool := make([]string, 0, len(secondPool))
	for syl := range secondPool {
		pool = append(pool, syl)
	}
	if err := shuffle(pool); err != nil {
		return nil, err
	}

	seen := map[string]struct{}{}
	var decoys []string
	for _, syl := range pool {
		if len(decoys) >= n {
			break
		}
		candidate := base + " " + syl
		if _, real := allWordsSet[candidate]; real {
			continue
		}
		if _, ok := seen[candidate]; ok {
			continue
		}
		seen[candidate] = struct{}{}
		decoys = append(decoys, candidate)
	}

	// Fallback pads that are unlikely to form real words
	pads := []string{"lạc", "xoàng", "thùng", "quặng", "nhắng", "vặt", "phắng", "khuếch"}
	for _, pad := range pads {
		if len(decoys) >= n {
			break
		}
		candidate := base + " " + pad
		if _, real := allWordsSet[candidate]; real {
			continue
		}
		if _, ok := seen[candidate]; ok {
			continue
		}
		seen[candidate] = struct{}{}
		decoys = append(decoys, candidate)
	}

	return decoys, nil
}

func sampleN(pool []string, n int) ([]string, error) {
	if n >= len(pool) {
		return pool, nil
	}
	cp := make([]string, len(pool))
	copy(cp, pool)
	if err := shuffle(cp); err != nil {
		return nil, err
	}
	return cp[:n], nil
}

func shuffle(s []string) error {
	for i := len(s) - 1; i > 0; i-- {
		j, err := randN(int64(i + 1))
		if err != nil {
			return err
		}
		s[i], s[j] = s[j], s[i]
	}
	return nil
}

func randN(n int64) (int64, error) {
	if n <= 0 {
		return 0, nil
	}
	v, err := rand.Int(rand.Reader, big.NewInt(n))
	if err != nil {
		return 0, err
	}
	return v.Int64(), nil
}

// latinBaseInitial extracts the base latin letter of a Vietnamese syllable (for bucketing).
func latinBaseInitial(token string) string {
	for _, r := range token {
		r = unicode.ToLower(r)
		if r == 'đ' {
			return "d"
		}
		decomposed := norm.NFD.String(string(r))
		for _, dr := range decomposed {
			if unicode.Is(unicode.Mn, dr) {
				continue
			}
			if dr >= 'a' && dr <= 'z' {
				return string(dr)
			}
			return ""
		}
	}
	return ""
}

// suppress unused warning
var _ = latinBaseInitial
