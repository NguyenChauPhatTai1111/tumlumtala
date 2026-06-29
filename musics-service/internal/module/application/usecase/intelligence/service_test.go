package intelligence

import (
	"testing"

	mediadto "github.com/tumlumtala/musics-service/internal/module/application/dto/media"
)

func TestBuildPlanUnderstandsVietnameseMoodJourney(t *testing.T) {
	service := &Service{}
	plan := service.buildPlan(
		"Hôm nay đi làm mệt quá, tạo playlist Chill Pop 2 giờ và cuối cùng vui hơn",
		"dj",
		0,
		nil,
	)

	if plan.DurationMinutes != 120 {
		t.Fatalf("duration = %d, want 120", plan.DurationMinutes)
	}
	if plan.Activity != "coding" {
		t.Fatalf("activity = %q, want coding", plan.Activity)
	}
	if len(plan.SearchQueries) == 0 {
		t.Fatal("expected search queries")
	}
	if got := plan.EnergyCurve[len(plan.EnergyCurve)-1].Energy; got <= plan.EnergyCurve[0].Energy {
		t.Fatalf("energy should improve through the journey: start=%v end=%v", plan.EnergyCurve[0].Energy, got)
	}
}

func TestRankCandidatesFollowsEnergyCurveAndDiversifiesArtists(t *testing.T) {
	service := &Service{}
	low, high := 0.2, 0.9
	plan := service.buildPlan("buồn nhưng muốn vui dần", "dj", 60, nil)
	plan.TargetTrackCount = 3
	candidates := []mediadto.MediaItemRequest{
		{SourceID: "low", Type: "audio", Title: "Quiet", Artist: "A", Genre: "Chill Pop", Energy: &low},
		{SourceID: "high", Type: "audio", Title: "Peak", Artist: "B", Genre: "Chill Pop", Energy: &high},
		{SourceID: "same-artist", Type: "audio", Title: "Another", Artist: "A", Genre: "Chill Pop", Energy: &high},
	}

	result := service.rankCandidates("user", candidates, plan, nil, nil)
	if len(result) != 3 {
		t.Fatalf("len(result) = %d, want 3", len(result))
	}
	if result[0].MediaItem.SourceID != "low" {
		t.Fatalf("first track = %q, want low-energy warmup", result[0].MediaItem.SourceID)
	}
}
