package id

import (
	"crypto/rand"
	"encoding/hex"
)

func New() string {
	var buf [16]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "unknown"
	}
	return hex.EncodeToString(buf[:])
}
