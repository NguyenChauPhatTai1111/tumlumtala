package entity

import "time"

type Role string

const (
	RoleAdministrator Role = "administrator"
	RoleMember        Role = "member"
	RoleManager       Role = "manager"
)

func (r Role) IsValid() bool {
	return r == RoleAdministrator || r == RoleMember || r == RoleManager
}

type User struct {
	ID        uint64
	UUID      string
	Email     string
	Password  string
	Fullname  string
	Role      Role
	CreatedAt time.Time
	UpdatedAt time.Time
}
