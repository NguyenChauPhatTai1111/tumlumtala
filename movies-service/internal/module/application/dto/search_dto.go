package dto

import (
	"time"

	searchentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/search"
)

type AddSearchHistoryRequest struct {
	Keyword string `json:"keyword" binding:"required"`
}

type SearchHistoryResponse struct {
	ID        uint      `json:"id"`
	Keyword   string    `json:"keyword"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func ToSearchHistoryResponse(item searchentity.SearchHistory) SearchHistoryResponse {
	return SearchHistoryResponse{
		ID:        item.ID,
		Keyword:   item.Keyword,
		CreatedAt: item.CreatedAt,
		UpdatedAt: item.UpdatedAt,
	}
}

func ToSearchHistoryResponses(items []searchentity.SearchHistory) []SearchHistoryResponse {
	result := make([]SearchHistoryResponse, 0, len(items))
	for _, item := range items {
		result = append(result, ToSearchHistoryResponse(item))
	}
	return result
}
