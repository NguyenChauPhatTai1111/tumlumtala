package intelligence

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	intelligencedto "github.com/tumlumtala/musics-service/internal/module/application/dto/intelligence"
	intelligenceentity "github.com/tumlumtala/musics-service/internal/module/domain/entity/intelligence"
)

var ErrPlannerUnavailable = errors.New("music AI planner is not configured")

type Planner interface {
	Plan(ctx context.Context, prompt string, dna []intelligenceentity.DNADimension, fallback intelligencedto.JourneyPlan) (intelligencedto.JourneyPlan, error)
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
		client:   &http.Client{Timeout: 15 * time.Second},
	}
}

func (p *CompatiblePlanner) Plan(ctx context.Context, prompt string, dna []intelligenceentity.DNADimension, fallback intelligencedto.JourneyPlan) (intelligencedto.JourneyPlan, error) {
	if p.endpoint == "" || p.apiKey == "" {
		return fallback, ErrPlannerUnavailable
	}

	dnaSummary := make([]string, 0, min(len(dna), 20))
	for _, item := range dna {
		if len(dnaSummary) == 20 {
			break
		}
		dnaSummary = append(dnaSummary, fmt.Sprintf("%s=%s(%.1f)", item.DimensionType, item.DimensionValue, item.PositiveScore-item.NegativeScore))
	}
	fallbackJSON, _ := json.Marshal(fallback)
	system := `You are a music journey planner. Return only one JSON object matching the supplied fallback schema.
Never invent track names. Produce search_queries, moods, genres, energy_curve and timeline.
Energy values must be 0..1, duration 10..480 minutes, target_track_count 3..80.
Understand Vietnamese and English. Preserve useful fallback values when the prompt is ambiguous.`
	user := fmt.Sprintf("Prompt: %s\nListening DNA: %s\nFallback JSON: %s", prompt, strings.Join(dnaSummary, ", "), fallbackJSON)

	body, _ := json.Marshal(map[string]any{
		"model": p.model,
		"messages": []map[string]string{
			{"role": "system", "content": system},
			{"role": "user", "content": user},
		},
		"temperature":     0.2,
		"response_format": map[string]string{"type": "json_object"},
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.endpoint, bytes.NewReader(body))
	if err != nil {
		return fallback, err
	}
	req.Header.Set("Authorization", "Bearer "+p.apiKey)
	req.Header.Set("Content-Type", "application/json")

	res, err := p.client.Do(req)
	if err != nil {
		return fallback, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		payload, _ := io.ReadAll(io.LimitReader(res.Body, 1024))
		return fallback, fmt.Errorf("music AI planner returned %d: %s", res.StatusCode, strings.TrimSpace(string(payload)))
	}

	var envelope struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&envelope); err != nil {
		return fallback, err
	}
	if len(envelope.Choices) == 0 {
		return fallback, errors.New("music AI planner returned no choices")
	}
	content := strings.TrimSpace(envelope.Choices[0].Message.Content)
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	var plan intelligencedto.JourneyPlan
	if err := json.Unmarshal([]byte(strings.TrimSpace(content)), &plan); err != nil {
		return fallback, err
	}
	return normalizePlan(plan, fallback), nil
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
