package entity

import "time"

type Role string
type Status string

const (
	RoleAdministrator Role = "administrator"
	RoleMember        Role = "member"
	RoleManager       Role = "manager"
)

const (
	StatusActive   Status = "active"
	StatusInactive Status = "inactive"
)

func (r Role) IsValid() bool {
	return r == RoleAdministrator || r == RoleMember || r == RoleManager
}

func (s Status) IsValid() bool {
	return s == StatusActive || s == StatusInactive
}

type User struct {
	ID        uint64
	UUID      string
	Email     string
	Password  string
	Fullname  string
	Avatar    string
	Role      Role
	Status    Status
	CreatedAt time.Time
	UpdatedAt time.Time
}
