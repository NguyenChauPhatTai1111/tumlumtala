package spotify

import (
	"bytes"
	"io"
	"net/http"
	"strconv"
	"sync"
	"time"
)

// cacheTransport caches successful GET responses from the Spotify API by URL.
// Spotify data served here is app-level (client-credentials), not per-user, so a
// shared cache is safe. On upstream errors (including HTTP 429 rate limits) it
// falls back to the last known good response even if expired, so the UI keeps
// showing data instead of going blank while Spotify throttles us.
type cacheTransport struct {
	base       http.RoundTripper
	ttl        time.Duration
	maxEntries int

	mu           sync.Mutex
	entries      map[string]*cacheEntry
	blockedUntil time.Time // set from Retry-After on 429: stop hitting Spotify until then
}

// maxRetryAfterWait caps how long a Spotify Retry-After header can suspend
// upstream calls, so a bogus header cannot disable the integration for days.
const maxRetryAfterWait = 6 * time.Hour

type cacheEntry struct {
	body       []byte
	header     http.Header
	statusCode int
	storedAt   time.Time
}

func newCacheTransport(base http.RoundTripper, ttl time.Duration, maxEntries int) *cacheTransport {
	if base == nil {
		base = http.DefaultTransport
	}
	return &cacheTransport{
		base:       base,
		ttl:        ttl,
		maxEntries: maxEntries,
		entries:    make(map[string]*cacheEntry),
	}
}

func (t *cacheTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if req.Method != http.MethodGet {
		return t.base.RoundTrip(req)
	}

	key := req.URL.String()

	t.mu.Lock()
	entry, ok := t.entries[key]
	blocked := time.Now().Before(t.blockedUntil)
	t.mu.Unlock()

	if ok && time.Since(entry.storedAt) < t.ttl {
		return entry.response(req), nil
	}

	// While Spotify's Retry-After window is active, don't hit upstream at all:
	// serve stale data if any, otherwise synthesize a 429 locally.
	if blocked {
		if ok {
			return entry.response(req), nil
		}
		return &http.Response{
			StatusCode: http.StatusTooManyRequests,
			Status:     http.StatusText(http.StatusTooManyRequests),
			Proto:      "HTTP/1.1",
			ProtoMajor: 1,
			ProtoMinor: 1,
			Header:     http.Header{},
			Body:       io.NopCloser(bytes.NewReader(nil)),
			Request:    req,
		}, nil
	}

	res, err := t.base.RoundTrip(req)
	if err == nil && res.StatusCode == http.StatusTooManyRequests {
		if wait, parseErr := strconv.Atoi(res.Header.Get("Retry-After")); parseErr == nil && wait > 0 {
			until := time.Now().Add(min(time.Duration(wait)*time.Second, maxRetryAfterWait))
			t.mu.Lock()
			if until.After(t.blockedUntil) {
				t.blockedUntil = until
			}
			t.mu.Unlock()
		}
	}
	if err == nil && res.StatusCode >= 200 && res.StatusCode < 300 {
		body, readErr := io.ReadAll(io.LimitReader(res.Body, 4<<20))
		res.Body.Close()
		if readErr != nil {
			if ok {
				return entry.response(req), nil
			}
			return nil, readErr
		}
		fresh := &cacheEntry{
			body:       body,
			header:     res.Header.Clone(),
			statusCode: res.StatusCode,
			storedAt:   time.Now(),
		}
		t.store(key, fresh)
		return fresh.response(req), nil
	}

	// Upstream failed (network error, 429, 5xx...): serve stale data if we have it.
	if ok {
		if res != nil {
			res.Body.Close()
		}
		return entry.response(req), nil
	}
	return res, err
}

func (t *cacheTransport) store(key string, entry *cacheEntry) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if len(t.entries) >= t.maxEntries {
		// Evict expired entries first; if still over, drop the oldest.
		var oldestKey string
		var oldestAt time.Time
		for k, e := range t.entries {
			if time.Since(e.storedAt) >= t.ttl {
				delete(t.entries, k)
				continue
			}
			if oldestKey == "" || e.storedAt.Before(oldestAt) {
				oldestKey, oldestAt = k, e.storedAt
			}
		}
		if len(t.entries) >= t.maxEntries && oldestKey != "" {
			delete(t.entries, oldestKey)
		}
	}
	t.entries[key] = entry
}

func (e *cacheEntry) response(req *http.Request) *http.Response {
	return &http.Response{
		StatusCode:    e.statusCode,
		Status:        http.StatusText(e.statusCode),
		Proto:         "HTTP/1.1",
		ProtoMajor:    1,
		ProtoMinor:    1,
		Header:        e.header.Clone(),
		Body:          io.NopCloser(bytes.NewReader(e.body)),
		ContentLength: int64(len(e.body)),
		Request:       req,
	}
}
