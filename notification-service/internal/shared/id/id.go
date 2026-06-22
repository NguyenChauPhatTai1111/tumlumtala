package id

import (
	"crypto/rand"
	"encoding/hex"
)

const randomIDBytes = 16

func New() string {
	var buf [randomIDBytes]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "unknow"
	}
	return hex.EncodeToString(buf[:])
}
