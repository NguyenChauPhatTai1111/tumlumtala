#!/bin/sh
set -eu

mode="${1:-ensure}"

if [ "$mode" = "fresh" ]; then
  mysql --user=root --password="$MYSQL_ROOT_PASSWORD" \
    --execute="DROP DATABASE IF EXISTS \`$MYSQL_DATABASE\`;"
fi

mysql --user=root --password="$MYSQL_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS \`$MYSQL_DATABASE\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$MYSQL_USER'@'%' IDENTIFIED BY '$MYSQL_PASSWORD';
ALTER USER '$MYSQL_USER'@'%' IDENTIFIED BY '$MYSQL_PASSWORD';
GRANT ALL PRIVILEGES ON \`$MYSQL_DATABASE\`.* TO '$MYSQL_USER'@'%';
FLUSH PRIVILEGES;
SQL

# One-time, non-destructive transition from the legacy shared database. The
# source table is copied (not moved or dropped), so rollback remains possible.
if [ "$mode" != "fresh" ]; then
  legacy_database="${LEGACY_USERS_DATABASE:-tumlumtala}"
  legacy_exists="$(mysql --user=root --password="$MYSQL_ROOT_PASSWORD" --batch --skip-column-names \
    --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$legacy_database' AND table_name='users';")"
  target_exists="$(mysql --user=root --password="$MYSQL_ROOT_PASSWORD" --batch --skip-column-names \
    --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$MYSQL_DATABASE' AND table_name='users';")"

  if [ "$legacy_exists" = "1" ] && [ "$target_exists" = "0" ]; then
    mysql --user=root --password="$MYSQL_ROOT_PASSWORD" <<SQL
CREATE TABLE \`$MYSQL_DATABASE\`.\`users\` LIKE \`$legacy_database\`.\`users\`;
INSERT INTO \`$MYSQL_DATABASE\`.\`users\` SELECT * FROM \`$legacy_database\`.\`users\`;
SQL
    echo "Copied legacy $legacy_database.users to $MYSQL_DATABASE.users"
  fi
fi
