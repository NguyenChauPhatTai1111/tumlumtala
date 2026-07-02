#!/bin/bash
# Stream and pretty-print logs from all app containers

FORMATTER="$(dirname "$0")/log_formatter.py"

stream_container() {
  local container="$1"
  local label="$2"
  local color="$3"
  docker logs -f --tail=0 "$container" 2>&1 | python3 "$FORMATTER" "$label" "$color" &
}

stream_container tumlumtala-auth-service          "auth"      "75"
stream_container tumlumtala-authorization-service "authz"     "75"
stream_container tumlumtala-users-service         "users"     "75"
stream_container tumlumtala-messenger-service     "messenger" "75"
stream_container tumlumtala-movies-service        "movies"    "75"
stream_container tumlumtala-musics-service        "musics"    "75"
stream_container tumlumtala-notification-api      "notify-api" "75"
stream_container tumlumtala-notification-worker   "notify-worker" "75"
stream_container tumlumtala-gateway               "gateway"   "75"

trap 'kill $(jobs -p) 2>/dev/null' INT TERM EXIT
wait
