#!/bin/sh
PIDS=$(pgrep -f "node.*vite" 2>/dev/null)
if [ -n "$PIDS" ]; then
  kill $PIDS 2>/dev/null
fi
exit 0
