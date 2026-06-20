package liked

import (
	"context"
	"time"

	"github.com/tumlumtala/movies-service/internal/module/application/dto"
	likedentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/liked"
	movierepo "github.com/tumlumtala/movies-service/internal/module/domain/repository"
)

type LikedMovieUseCase struct {
	repo movierepo.MovieWriteRepository
}

func NewLikedMovieUseCase(repo movierepo.MovieWriteRepository) *LikedMovieUseCase {
	return &LikedMovieUseCase{repo: repo}
}

func (u *LikedMovieUseCase) Like(ctx context.Context, userUUID string, req dto.LikeMovieRequest) (*dto.LikedMovieResponse, error) {
	item := likedentity.MovieLiked{
		UserUUID:   userUUID,
		Slug:       req.Slug,
		Name:       req.Name,
		OriginName: req.OriginName,
		Thumbnail:  req.Thumbnail,
		PosterURL:  req.PosterURL,
		Type:       req.Type,
		Year:       req.Year,
		Quality:    req.Quality,
		Lang:       req.Lang,
		Rating:     req.Rating,
		LikedAt:    time.Now(),
	}
	saved, err := u.repo.LikeMovie(ctx, userUUID, item)
	if err != nil {
		return nil, err
	}
	resp := dto.ToLikedMovieResponse(*saved)
	return &resp, nil
}

func (u *LikedMovieUseCase) Unlike(ctx context.Context, userUUID string, slug string) error {
	return u.repo.UnlikeMovie(ctx, userUUID, slug)
}
