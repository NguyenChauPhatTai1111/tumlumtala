package intelligence

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	intelligencedto "github.com/tumlumtala/musics-service/internal/module/application/dto/intelligence"
	intelligenceentity "github.com/tumlumtala/musics-service/internal/module/domain/entity/intelligence"
)

var ErrPlannerUnavailable = errors.New("music AI planner is not configured")

type Planner interface {
	Plan(ctx context.Context, prompt string, dna []intelligenceentity.DNADimension, fallback intelligencedto.JourneyPlan) (intelligencedto.JourneyPlan, error)
	GenerateMessage(ctx context.Context, userPrompt string, plan intelligencedto.JourneyPlan) (string, error)
}

type CompatiblePlanner struct {
	endpoint string
	apiKey   string
	model    string
	client   *http.Client
}

func NewCompatiblePlanner(endpoint, apiKey, model string) *CompatiblePlanner {
	return &CompatiblePlanner{
		endpoint: strings.TrimRight(strings.TrimSpace(endpoint), "/"),
		apiKey:   strings.TrimSpace(apiKey),
		model:    strings.TrimSpace(model),
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

func (p *CompatiblePlanner) Plan(ctx context.Context, prompt string, dna []intelligenceentity.DNADimension, fallback intelligencedto.JourneyPlan) (intelligencedto.JourneyPlan, error) {
	if p.endpoint == "" || p.apiKey == "" {
		slog.Warn("music AI planner not configured — falling back to keyword matching", "endpoint_set", p.endpoint != "", "key_set", p.apiKey != "")
		return fallback, ErrPlannerUnavailable
	}
	slog.Info("music AI planner: calling LLM", "model", p.model, "prompt_len", len(prompt))
	// Use an independent context so a slow local LLM (e.g. Ollama) is not
	// cancelled when the HTTP request context from the caller times out.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Build a compact DNA summary (top 10 dimensions only).
	dnaSummary := make([]string, 0, min(len(dna), 10))
	for _, item := range dna {
		if len(dnaSummary) == 10 {
			break
		}
		dnaSummary = append(dnaSummary, fmt.Sprintf("%s:%s", item.DimensionType, item.DimensionValue))
	}

	// Ask the LLM only for the 3 fields it can realistically improve over
	// keyword matching. Timeline, energy curves and duration are computed
	// deterministically by buildPlan and merged back via normalizePlan.
	system := `You are a music intent parser. Read the user prompt and return ONLY a JSON object with exactly these three keys:
{"genres":["..."],"moods":["..."],"search_queries":["..."]}
genres: 1-4 music genres in English (e.g. "V-Pop", "Bolero", "Indie", "Lo-fi").
moods: 1-3 mood words in English (e.g. "nostalgic", "calm", "happy").
search_queries: 3-6 short Audius search strings that will find matching tracks.
Return ONLY the JSON. No explanation. No markdown.`
	user := fmt.Sprintf("User prompt: %s\nUser's top taste: %s", prompt, strings.Join(dnaSummary, ", "))

	body, _ := json.Marshal(map[string]any{
		"model": p.model,
		"messages": []map[string]string{
			{"role": "system", "content": system},
			{"role": "user", "content": user},
		},
		"temperature": 0.3,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.endpoint, bytes.NewReader(body))
	if err != nil {
		return fallback, err
	}
	req.Header.Set("Authorization", "Bearer "+p.apiKey)
	req.Header.Set("Content-Type", "application/json")

	res, err := p.client.Do(req)
	if err != nil {
		slog.Error("music AI planner: HTTP request failed — falling back to keyword matching", "err", err)
		return fallback, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		payload, _ := io.ReadAll(io.LimitReader(res.Body, 1024))
		err := fmt.Errorf("music AI planner returned %d: %s", res.StatusCode, strings.TrimSpace(string(payload)))
		slog.Error("music AI planner: bad status — falling back to keyword matching", "err", err)
		return fallback, err
	}

	var envelope struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&envelope); err != nil {
		slog.Error("music AI planner: failed to decode response — falling back to keyword matching", "err", err)
		return fallback, err
	}
	if len(envelope.Choices) == 0 {
		slog.Error("music AI planner: no choices in response — falling back to keyword matching")
		return fallback, errors.New("music AI planner returned no choices")
	}
	content := strings.TrimSpace(envelope.Choices[0].Message.Content)
	// Strip optional markdown fences.
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)

	// Parse only the 3 lightweight fields.
	var intent struct {
		Genres        []string `json:"genres"`
		Moods         []string `json:"moods"`
		SearchQueries []string `json:"search_queries"`
	}
	if err := json.Unmarshal([]byte(content), &intent); err != nil {
		slog.Error("music AI planner: failed to parse intent JSON — falling back to keyword matching", "err", err, "raw", content[:min(len(content), 300)])
		return fallback, err
	}

	// Merge LLM intent into the keyword-matched fallback plan.
	plan := fallback
	if len(intent.Genres) > 0 {
		plan.Genres = intent.Genres
	}
	if len(intent.Moods) > 0 {
		plan.Moods = intent.Moods
	}
	if len(intent.SearchQueries) > 0 {
		plan.SearchQueries = intent.SearchQueries
	}
	slog.Info("music AI planner: intent extracted", "genres", plan.Genres, "moods", plan.Moods, "queries", plan.SearchQueries)
	return plan, nil
}

func (p *CompatiblePlanner) GenerateMessage(ctx context.Context, userPrompt string, plan intelligencedto.JourneyPlan) (string, error) {
	if p.endpoint == "" || p.apiKey == "" {
		return "", ErrPlannerUnavailable
	}
	slog.Info("music AI planner: generating assistant message", "prompt", userPrompt)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	startEnergy := 0.0
	peakEnergy := 0.0
	endEnergy := 0.0
	if len(plan.EnergyCurve) >= 3 {
		startEnergy = plan.EnergyCurve[0].Energy * 100
		peakEnergy = plan.EnergyCurve[1].Energy * 100
		endEnergy = plan.EnergyCurve[2].Energy * 100
	}

	system := `Bạn là AI DJ. Viết MỘT câu tiếng Việt ngắn gọn, tự nhiên, thân thiện để mô tả playlist vừa tạo cho người dùng. Phong cách như người bạn đang nói chuyện — không cứng nhắc, không template. KHÔNG đề cập số phút hay số bài. Không dùng emoji. Chỉ trả về đúng một câu, không giải thích thêm.`
	user := fmt.Sprintf(
		"Người dùng yêu cầu: \"%s\"\nPlaylist: thể loại %s, mood: %s, năng lượng từ %.0f%% lên peak %.0f%% rồi kết ở %.0f%%.",
		userPrompt,
		strings.Join(plan.Genres, ", "), strings.Join(plan.Moods, ", "),
		startEnergy, peakEnergy, endEnergy,
	)

	body, _ := json.Marshal(map[string]any{
		"model": p.model,
		"messages": []map[string]string{
			{"role": "system", "content": system},
			{"role": "user", "content": user},
		},
		"temperature": 0.85,
		"max_tokens":  150,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.endpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+p.apiKey)
	req.Header.Set("Content-Type", "application/json")

	res, err := p.client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return "", fmt.Errorf("generate message: status %d", res.StatusCode)
	}

	var envelope struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 4096)).Decode(&envelope); err != nil {
		return "", err
	}
	if len(envelope.Choices) == 0 {
		return "", errors.New("no choices")
	}
	return strings.TrimSpace(envelope.Choices[0].Message.Content), nil
}

func normalizePlan(plan, fallback intelligencedto.JourneyPlan) intelligencedto.JourneyPlan {
	if plan.DurationMinutes < 10 || plan.DurationMinutes > 480 {
		plan.DurationMinutes = fallback.DurationMinutes
	}
	if plan.TargetTrackCount < 3 || plan.TargetTrackCount > 80 {
		plan.TargetTrackCount = fallback.TargetTrackCount
	}
	if len(plan.SearchQueries) == 0 {
		plan.SearchQueries = fallback.SearchQueries
	}
	if len(plan.Timeline) == 0 {
		plan.Timeline = fallback.Timeline
	}
	if len(plan.EnergyCurve) == 0 {
		plan.EnergyCurve = fallback.EnergyCurve
	}
	plan.DiscoveryLevel = clamp(plan.DiscoveryLevel, 0, 1)
	for i := range plan.EnergyCurve {
		plan.EnergyCurve[i].Energy = clamp(plan.EnergyCurve[i].Energy, 0, 1)
	}
	for i := range plan.Timeline {
		plan.Timeline[i].TargetEnergy = clamp(plan.Timeline[i].TargetEnergy, 0, 1)
	}
	return plan
}

func clamp(value, low, high float64) float64 {
	if value < low {
		return low
	}
	if value > high {
		return high
	}
	return value
}
