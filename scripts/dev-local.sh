#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-localhost}"
BACKEND_HOST="${BACKEND_HOST:-localhost}"
INSTALL_MISSING="${INSTALL_MISSING:-1}"
OPEN_BROWSER="${OPEN_BROWSER:-1}"
MARKET_API_URL="${OMXSUM_MARKET_API_URL:-https://terminal.omxsum.com/api/v1}"

usage() {
    cat <<'EOF'
Start the OMXsum frontend and backend for local development.

Usage:
  ./scripts/dev-local.sh [--no-install] [--no-browser]

The frontend repository and newsbackend repository should normally be sibling
directories. Override discovery with OMXSUM_BACKEND_DIR when needed.

Environment overrides:
  OMXSUM_BACKEND_DIR  Path to the newsbackend checkout
  FRONTEND_PORT       Next.js port (default: 5173)
  BACKEND_PORT        Express port (default: 8000)
  OMXSUM_MARKET_API_URL
                       Market API base URL (default: production v1 API)
  INSTALL_MISSING     Run npm ci when node_modules is absent (default: 1)
  OPEN_BROWSER        Open the site after startup (default: 1)
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-install)
            INSTALL_MISSING=0
            ;;
        --no-browser)
            OPEN_BROWSER=0
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage >&2
            exit 2
            ;;
    esac
    shift
done

resolve_backend_dir() {
    if [[ -n "${OMXSUM_BACKEND_DIR:-}" ]]; then
        printf '%s\n' "${OMXSUM_BACKEND_DIR}"
        return
    fi

    local candidate
    for candidate in \
        "${FRONTEND_DIR}/../newsbackend" \
        "${FRONTEND_DIR}/../newsbackend-main" \
        "${FRONTEND_DIR}/../backend"; do
        if [[ -f "${candidate}/main.js" && -f "${candidate}/package.json" ]]; then
            printf '%s\n' "${candidate}"
            return
        fi
    done

    return 1
}

if ! BACKEND_DIR_RAW="$(resolve_backend_dir)"; then
    echo "Could not find the newsbackend checkout." >&2
    echo "Clone it beside this repository or set OMXSUM_BACKEND_DIR=/absolute/path." >&2
    exit 1
fi

if [[ ! -d "${BACKEND_DIR_RAW}" ]]; then
    echo "Backend directory does not exist: ${BACKEND_DIR_RAW}" >&2
    exit 1
fi

BACKEND_DIR="$(cd "${BACKEND_DIR_RAW}" && pwd)"
FRONTEND_URL="http://${FRONTEND_HOST}:${FRONTEND_PORT}"
BACKEND_URL="http://${BACKEND_HOST}:${BACKEND_PORT}"

for command_name in node npm curl; do
    if ! command -v "${command_name}" >/dev/null 2>&1; then
        echo "Missing required command: ${command_name}" >&2
        exit 1
    fi
done

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [[ "${node_major}" -lt 20 ]]; then
    echo "Node.js 20 or newer is required (found $(node --version))." >&2
    exit 1
fi

port_in_use() {
    local port="$1"
    if command -v lsof >/dev/null 2>&1; then
        lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
        return
    fi
    return 1
}

if port_in_use "${BACKEND_PORT}"; then
    echo "Backend port ${BACKEND_PORT} is already in use." >&2
    exit 1
fi
if port_in_use "${FRONTEND_PORT}"; then
    echo "Frontend port ${FRONTEND_PORT} is already in use." >&2
    exit 1
fi

if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
    echo "Missing ${BACKEND_DIR}/.env" >&2
    if [[ -f "${BACKEND_DIR}/.env.example" ]]; then
        echo "Create it with: cp '${BACKEND_DIR}/.env.example' '${BACKEND_DIR}/.env'" >&2
    fi
    exit 1
fi

for key in MONGO_HOST MONGO_PORT MONGODB JWT_KEY; do
    if ! grep -Eq "^[[:space:]]*${key}=.+" "${BACKEND_DIR}/.env"; then
        echo "Backend .env is missing a value for ${key}." >&2
        exit 1
    fi
done

if ! grep -Eq "^[[:space:]]*OMXSUM_API_KEY=.+" "${BACKEND_DIR}/.env"; then
    echo "Warning: OMXsum Market API key is missing; company data and live news will be unavailable." >&2
fi

install_dependencies() {
    local project_name="$1"
    local project_dir="$2"
    local marker="$3"

    if [[ -e "${project_dir}/${marker}" ]]; then
        return
    fi
    if [[ "${INSTALL_MISSING}" != "1" ]]; then
        echo "${project_name} dependencies are missing. Run npm ci in ${project_dir}." >&2
        exit 1
    fi
    echo "Installing ${project_name} dependencies…"
    (cd "${project_dir}" && npm ci)
}

install_dependencies "backend" "${BACKEND_DIR}" "node_modules"
install_dependencies "frontend" "${FRONTEND_DIR}" "node_modules/.bin/next"

LOG_DIR="$(mktemp -d "${TMPDIR:-/tmp}/omxsum-local.XXXXXX")"
BACKEND_LOG="${LOG_DIR}/backend.log"
FRONTEND_LOG="${LOG_DIR}/frontend.log"
backend_pid=""
frontend_pid=""
tail_pid=""
cleaned_up=0

cleanup() {
    if [[ "${cleaned_up}" -eq 1 ]]; then
        return
    fi
    cleaned_up=1
    trap - EXIT INT TERM

    [[ -n "${tail_pid}" ]] && kill "${tail_pid}" >/dev/null 2>&1 || true
    [[ -n "${frontend_pid}" ]] && kill "${frontend_pid}" >/dev/null 2>&1 || true
    [[ -n "${backend_pid}" ]] && kill "${backend_pid}" >/dev/null 2>&1 || true
    [[ -n "${frontend_pid}" ]] && wait "${frontend_pid}" >/dev/null 2>&1 || true
    [[ -n "${backend_pid}" ]] && wait "${backend_pid}" >/dev/null 2>&1 || true
}

handle_signal() {
    echo
    echo "Stopping OMXsum local development…"
    cleanup
    exit 0
}

trap cleanup EXIT
trap handle_signal INT TERM

show_failure() {
    local service_name="$1"
    local log_file="$2"
    echo >&2
    echo "${service_name} did not become ready. Recent output:" >&2
    tail -n 40 "${log_file}" >&2 || true
}

wait_for_url() {
    local service_name="$1"
    local url="$2"
    local pid="$3"
    local log_file="$4"
    local attempt

    for attempt in $(seq 1 60); do
        if curl -fsS --max-time 2 "${url}" >/dev/null 2>&1; then
            return 0
        fi
        if ! kill -0 "${pid}" >/dev/null 2>&1; then
            show_failure "${service_name}" "${log_file}"
            return 1
        fi
        sleep 0.5
    done

    show_failure "${service_name}" "${log_file}"
    return 1
}

echo "Starting OMXsum backend on ${BACKEND_URL}…"
(
    cd "${BACKEND_DIR}"
    exec env \
        MODE=dev \
        NODE_ENV=development \
        PORT="${BACKEND_PORT}" \
        CLIENT_URL="${FRONTEND_URL}" \
        API_URL="${BACKEND_URL}/api" \
        STONKS_API_URL="${MARKET_API_URL}" \
        node --watch main.js
) >"${BACKEND_LOG}" 2>&1 &
backend_pid=$!

wait_for_url "Backend" "${BACKEND_URL}/api/feed/companies" "${backend_pid}" "${BACKEND_LOG}"

echo "Starting OMXsum frontend on ${FRONTEND_URL}…"
(
    cd "${FRONTEND_DIR}"
    exec env \
        API_URL="${BACKEND_URL}/api" \
        NEXT_PUBLIC_API_URL="${BACKEND_URL}/api" \
        "${FRONTEND_DIR}/node_modules/.bin/next" dev \
        --hostname "${FRONTEND_HOST}" \
        --port "${FRONTEND_PORT}"
) >"${FRONTEND_LOG}" 2>&1 &
frontend_pid=$!

wait_for_url "Frontend" "${FRONTEND_URL}" "${frontend_pid}" "${FRONTEND_LOG}"

echo
echo "OMXsum local development is ready:"
echo "  Frontend  ${FRONTEND_URL}"
echo "  Backend   ${BACKEND_URL}/api"
echo "  Market API ${MARKET_API_URL}"
echo "  Logs      ${LOG_DIR}"
echo
echo "Press Ctrl+C to stop both services."
echo

if [[ "${OPEN_BROWSER}" == "1" ]]; then
    if command -v open >/dev/null 2>&1; then
        open "${FRONTEND_URL}" >/dev/null 2>&1 || true
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "${FRONTEND_URL}" >/dev/null 2>&1 || true
    fi
fi

tail -n +1 -F "${BACKEND_LOG}" "${FRONTEND_LOG}" &
tail_pid=$!

while kill -0 "${backend_pid}" >/dev/null 2>&1 && kill -0 "${frontend_pid}" >/dev/null 2>&1; do
    sleep 1
done

echo "A development service stopped unexpectedly." >&2
exit 1
