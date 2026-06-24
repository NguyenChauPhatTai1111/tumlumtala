package search

type AddSearchHistoryRequest struct {
	Keyword string `json:"keyword" binding:"required"`
}
