package entity

import "time"

type Session struct {
	UserUUID  string
	Email     string
	Role      string
	ExpiresAt time.Time
}
