package certification

import (
	"context"
	"sync"
	"time"

	certentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/certification"
	movierepo "github.com/tumlumtala/movies-service/internal/module/domain/repository"
	"github.com/tumlumtala/movies-service/internal/module/infrastructure/tmdb"
)

const cacheTTL = 30 * 24 * time.Hour

type MovieInput struct {
	Slug     string `json:"slug"`
	TmdbID   string `json:"tmdb_id"`
	TmdbType string `json:"tmdb_type"`
}

// BatchUseCase fetches missing certifications from TMDB and persists them.
// It accepts pre-fetched cached results from the caller (query layer).
type BatchUseCase struct {
	repo   movierepo.MovieWriteRepository
	client *tmdb.Client
}

func NewBatchUseCase(repo movierepo.MovieWriteRepository, client *tmdb.Client) *BatchUseCase {
	return &BatchUseCase{repo: repo, client: client}
}

// FetchAndStore fetches certifications for movies not in cached, stores them, and returns the full result map.
func (uc *BatchUseCase) FetchAndStore(ctx context.Context, missing []MovieInput) (map[string]string, error) {
	if len(missing) == 0 {
		return map[string]string{}, nil
	}

	type fetchResult struct {
		slug   string
		rating string
		input  MovieInput
	}

	sem := make(chan struct{}, 5)
	ch := make(chan fetchResult, len(missing))
	var wg sync.WaitGroup

	for _, m := range missing {
		wg.Add(1)
		m := m
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			rating, _ := uc.client.GetCertification(ctx, m.TmdbID, m.TmdbType)
			ch <- fetchResult{slug: m.Slug, rating: rating, input: m}
		}()
	}
	wg.Wait()
	close(ch)

	result := make(map[string]string, len(missing))
	for fr := range ch {
		result[fr.slug] = fr.rating
		tmdbType := fr.input.TmdbType
		if tmdbType == "" {
			tmdbType = "movie"
		}
		_ = uc.repo.UpsertCertification(ctx, certentity.MovieCertification{
			Slug:      fr.slug,
			TmdbID:    fr.input.TmdbID,
			TmdbType:  tmdbType,
			Rating:    fr.rating,
			FetchedAt: time.Now(),
		})
	}
	return result, nil
}
