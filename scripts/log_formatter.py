#!/usr/bin/env python3
import sys
import json
import re
from datetime import datetime, timezone, timedelta

VN_TZ = timezone(timedelta(hours=7))

label      = sys.argv[1] if len(sys.argv) > 1 else "service"
color_code = sys.argv[2] if len(sys.argv) > 2 else "255"

R    = "\033[0m"
BOLD = "\033[1m"
DIM  = "\033[2m"

def c(code): return f"\033[38;5;{code}m"

LABEL_C    = c(color_code)
TIME_C     = c("242")
FILE_C     = c("208")    # orange - file path
SQL_C      = "\033[97m"  # bright white - SQL
SQL_ERR_C  = c("211")    # pink - slow/error SQL
TIME_SQL_C = c("221")    # yellow - [Xms] [rows:N]
GRPC_C     = c("51")     # cyan - gRPC
METHOD_COLORS = {
    "GET":     c("51"),
    "POST":    c("51"),
    "PUT":     c("51"),
    "DELETE":  c("51"),
    "PATCH":   c("51"),
    "OPTIONS": c("51"),
}
STATUS_COLORS = {
    "2": f"\033[1;{c('82')[2:]}",
    "4": f"\033[1;{c('226')[2:]}",
    "5": f"\033[1;{c('196')[2:]}",
}

GORM_FILE = re.compile(r'^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2} (/\S+\.go:\d+)$')
GORM_SQL  = re.compile(r'^\[([^\]]+ms)\] \[rows:(-?\d+)\] (.+)$')
SLOW_SQL  = re.compile(r'SLOW SQL', re.IGNORECASE)

def fmt_time():
    return datetime.now(VN_TZ).strftime("%H:%M:%S")

def fmt_time_from(ts):
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.astimezone(VN_TZ).strftime("%H:%M:%S")
    except Exception:
        return fmt_time()

def fmt_label():
    return f"{LABEL_C}[{label}]{R}"

def fmt_method(m):
    col = METHOD_COLORS.get(m, "")
    return f"{col}{m}{R}"

def fmt_status(s):
    s = str(s)
    col = STATUS_COLORS.get(s[0] if s else "", "")
    return f"{col}{s}{R}"

def handle_json(d):
    msg       = d.get("message", "")
    component = d.get("component", "")
    method    = d.get("method", "")
    route     = d.get("route") or d.get("path", "")
    http_st   = d.get("status", "")
    latency   = d.get("latency_ms", "")
    grpc_code = d.get("grpc_code", "")
    target    = d.get("target_service", "")
    ts        = d.get("time", "")

    t = fmt_time_from(ts) if ts else fmt_time()
    lat_str = f" {TIME_C}{latency}ms{R}" if latency != "" else ""

    if component == "http" and msg == "http request":
        print(f"{TIME_C}{t}{R} {fmt_label()} {fmt_method(method)} {route} → {fmt_status(http_st)}{lat_str}")
        return

    if component in ("grpc_server", "grpc_client"):
        svc = f"{target}." if target else ""
        short_method = method.split("/")[-1] if "/" in method else method
        print(f"{TIME_C}{t}{R} {fmt_label()} {GRPC_C}{svc}{short_method}{R} → {grpc_code}{lat_str}")
        return

    if "started" in msg:
        print(f"\n{TIME_C}{t}{R} {BOLD}{msg}{R}")
        return

def handle_gin(line):
    parts = line.split("|")
    if len(parts) < 5:
        return
    http_st = parts[1].strip()
    latency = parts[2].strip()
    last    = parts[4].strip()
    tokens  = last.split(None, 1)
    if len(tokens) < 2:
        return
    method = tokens[0].strip()
    path   = tokens[1].strip().strip('"')
    t = fmt_time()
    lat_str = f" {TIME_C}{latency}{R}" if latency else ""
    print(f"{TIME_C}{t}{R} {fmt_label()} {fmt_method(method)} {path} → {fmt_status(http_st)}{lat_str}")

pending_file = None

for line in sys.stdin:
    line = line.rstrip()
    if not line:
        continue
    try:
        m = GORM_FILE.match(line)
        if m:
            pending_file = m.group(1)
            continue

        m = GORM_SQL.match(line)
        if m:
            latency, rows, sql = m.group(1), m.group(2), m.group(3)
            is_slow = float(latency.replace("ms","")) >= 200

            print()
            if pending_file:
                slow_tag = f" {SQL_ERR_C}SLOW SQL >= 200ms{R}" if is_slow else ""
                print(f"{FILE_C}{pending_file}{R}{slow_tag}")
                pending_file = None

            sql_color = SQL_ERR_C if is_slow else SQL_C
            meta = f"{TIME_SQL_C}[{latency}] [rows:{rows}]{R} "
            print(f"{meta}{sql_color}{sql}{R}")
            sys.stdout.flush()
            continue

        pending_file = None

        if line.startswith("{"):
            d = json.loads(line)
            handle_json(d)
        elif line.startswith("[GIN] ") and "|" in line:
            handle_gin(line)

    except Exception:
        pass
    sys.stdout.flush()
