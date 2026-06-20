package entity

type Role struct {
	ID   uint
	Name string
}

type Permission struct {
	ID          uint
	Code        string
	Description string
}
