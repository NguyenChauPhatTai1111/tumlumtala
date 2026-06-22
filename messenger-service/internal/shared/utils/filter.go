package utils

import (
	"strconv"
	"strings"
)

const (
	SortAsc  = "asc"
	SortDesc = "desc"
)

type QueryFilter struct {
	Page   int    `form:"page"`
	Limit  int    `form:"limit"`
	Sort   string `form:"sort"`
	Order  string `form:"order"`
	Search string `form:"search"`
	Offset int    `form:"offset"`

	ExtraFilters map[string]string
}

func (q *QueryFilter) GetString(key string) string {
	if q.ExtraFilters == nil {
		return ""
	}
	return q.ExtraFilters[key]
}

func (q *QueryFilter) GetInt(key string) (int, bool) {
	v := q.GetString(key)
	if v == "" {
		return 0, false
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, false
	}
	return n, true
}

var defaultLimit = 10
var maxLimit = 1000
var defaultOrder = "created_at"
var resourceDefaultOrders = map[string]string{
	"conversation": "last_message_at",
	"message":      "created_at",
}

func (q *QueryFilter) normalizePage() {
	if q.Page <= 0 {
		q.Page = 1
	}
}

func (q *QueryFilter) normalizeLimit() {
	if q.Limit <= 0 {
		q.Limit = defaultLimit
	}
	if q.Limit > maxLimit {
		q.Limit = maxLimit
	}
}

func (q *QueryFilter) normalizeOrder(resource string) {
	if q.Order == "" {
		normalizedResource := strings.ToLower(strings.TrimSpace(resource))
		if order, ok := resourceDefaultOrders[normalizedResource]; ok {
			q.Order = order
			return
		}
		q.Order = defaultOrder
	}
}

func (q *QueryFilter) NormalizeOffset() {
	q.Offset = (q.Page - 1) * q.Limit
}

func (q *QueryFilter) normalizeSort() {
	if q.Sort == "" {
		q.Sort = SortAsc
	}
}

func (q *QueryFilter) Normalize(resource string) {
	q.normalizePage()
	q.normalizeLimit()
	q.normalizeOrder(resource)
	q.normalizeSort()
	q.NormalizeOffset()
}
