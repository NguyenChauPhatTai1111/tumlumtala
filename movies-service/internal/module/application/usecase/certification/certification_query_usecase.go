package certification

import (
	"context"
	"time"

	movierepo "github.com/tumlumtala/movies-service/internal/module/domain/repository"
)

// CertificationQueryUseCase reads cached certifications and delegates missing ones to BatchUseCase.
type CertificationQueryUseCase struct {
	repo    movierepo.MovieReadRepository
	fetchUC *BatchUseCase
}

func NewCertificationQueryUseCase(repo movierepo.MovieReadRepository, fetchUC *BatchUseCase) *CertificationQueryUseCase {
	return &CertificationQueryUseCase{repo: repo, fetchUC: fetchUC}
}

func (uc *CertificationQueryUseCase) BatchGet(ctx context.Context, movies []MovieInput) (map[string]string, error) {
	if len(movies) == 0 {
		return map[string]string{}, nil
	}

	slugs := make([]string, 0, len(movies))
	bySlug := make(map[string]MovieInput, len(movies))
	for _, m := range movies {
		if m.Slug != "" && m.TmdbID != "" {
			slugs = append(slugs, m.Slug)
			bySlug[m.Slug] = m
		}
	}

	result := make(map[string]string, len(slugs))

	cached, err := uc.repo.GetCertificationsBySlugs(ctx, slugs)
	if err != nil {
		return nil, err
	}
	fresh := time.Now().Add(-cacheTTL)

	for _, row := range cached {
		if row.FetchedAt.After(fresh) {
			result[row.Slug] = row.Rating
			delete(bySlug, row.Slug)
		}
	}

	if len(bySlug) == 0 {
		return result, nil
	}

	missing := make([]MovieInput, 0, len(bySlug))
	for _, m := range bySlug {
		missing = append(missing, m)
	}

	fetched, err := uc.fetchUC.FetchAndStore(ctx, missing)
	if err != nil {
		return nil, err
	}
	for slug, rating := range fetched {
		result[slug] = rating
	}
	return result, nil
}
