package http

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type lexiconValidator struct {
	words map[string]struct{}
	next  llmValidator
}

func newLexiconValidator(directory string, next llmValidator) (*lexiconValidator, error) {
	entries, err := os.ReadDir(directory)
	if err != nil {
		return nil, fmt.Errorf("đọc thư mục từ điển: %w", err)
	}
	words := make(map[string]struct{})
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".txt") {
			continue
		}
		file, openErr := os.Open(filepath.Join(directory, entry.Name()))
		if openErr != nil {
			return nil, fmt.Errorf("mở tệp từ điển %s: %w", entry.Name(), openErr)
		}
		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			word := normalizePhrase(scanner.Text())
			if word != "" && !strings.HasPrefix(word, "#") {
				words[word] = struct{}{}
			}
		}
		scanErr := scanner.Err()
		_ = file.Close()
		if scanErr != nil {
			return nil, fmt.Errorf("đọc tệp từ điển %s: %w", entry.Name(), scanErr)
		}
	}
	if len(words) == 0 {
		return nil, fmt.Errorf("từ điển %s không có dữ liệu", directory)
	}
	return &lexiconValidator{words: words, next: next}, nil
}

func (v *lexiconValidator) validateAndExplain(
	ctx context.Context,
	phrase string,
) (validationResult, error) {
	normalized := normalizePhrase(phrase)
	if _, exists := v.words[normalized]; !exists {
		return validationResult{
			Valid:       false,
			Normalized:  normalized,
			Explanation: fmt.Sprintf("“%s” không có trong từ điển tiếng Việt của trò chơi.", normalized),
		}, nil
	}
	result, err := v.next.validateAndExplain(ctx, normalized)
	if err != nil || !result.Valid {
		return result, err
	}
	canonical := normalizePhrase(result.Normalized)
	if canonical == "" {
		canonical = normalized
	}
	if _, exists := v.words[canonical]; !exists {
		return validationResult{
			Valid:       false,
			Normalized:  canonical,
			Explanation: fmt.Sprintf("“%s” không có trong từ điển tiếng Việt của trò chơi.", canonical),
		}, nil
	}
	result.Normalized = canonical
	return result, nil
}
