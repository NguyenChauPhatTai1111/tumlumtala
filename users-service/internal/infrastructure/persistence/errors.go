package persistence

import (
	"errors"

	"github.com/go-sql-driver/mysql"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
	"gorm.io/gorm"
)

func TranslateError(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return domainerrors.ErrNotFound
	}
	var mysqlErr *mysql.MySQLError
	if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
		return domainerrors.ErrEmailExists
	}
	return err
}
