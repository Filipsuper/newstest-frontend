#!/usr/bin/env bash

# Deploy the OMXsum frontend and backend to the VPS.
#
# The VPS is a 2 vCPU / 4 GB ARM box with no swap that also runs mongo, the
# stonks collectors and the live engine. A `next build` there needs more memory
# than the machine has free, and building both services at once has already
# taken the site down: load hit 140, mongo was killed, and nothing answered for
# 25 minutes. So images are built here, where there is room, and the VPS only
# loads a finished image and restarts a container.
#
# The site keeps serving the old container until a new image exists and is
# healthy. Any failure after the swap rolls back to the image that was running.

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${OMXSUM_BACKEND_DIR:-$(cd "${FRONTEND_DIR}/../newsbackend" 2>/dev/null && pwd || true)}"
STONKS_DIR="${OMXSUM_STONKS_DIR:-$(cd "${HOME}/stonks" 2>/dev/null && pwd || true)}"

REMOTE="${OMXSUM_REMOTE:-root@omxsum.com}"
REMOTE_DIR="${OMXSUM_REMOTE_DIR:-/root/newsweb}"
STONKS_REMOTE_DIR="${OMXSUM_STONKS_REMOTE_DIR:-/root/stonks}"
SITE_URL="${OMXSUM_SITE_URL:-https://omxsum.com}"
COMPOSE_PROJECT="${OMXSUM_COMPOSE_PROJECT:-newsweb}"
PLATFORM="${OMXSUM_PLATFORM:-linux/arm64}"

# Guards for the remote box, checked before anything is touched.
MIN_FREE_DISK_MB=3000
MAX_LOAD=6
REMOTE_BUILD_TIMEOUT=900
REMOTE_BUILD_CPUS="${OMXSUM_BUILD_CPUS:-1}"
REMOTE_BUILD_MEMORY="${OMXSUM_BUILD_MEMORY:-1400m}"

TARGETS=()
DRY_RUN=0
REMOTE_BUILD=0
ASSUME_YES=0
STATUS_ONLY=0
SKIP_PULL=0

SSH_OPTS=(-o ConnectTimeout=20 -o ServerAliveInterval=10 -o ServerAliveCountMax=6)

usage() {
    cat <<'EOF'
Deploy OMXsum to the VPS.

Usage:
  ./scripts/deploy.sh [frontend|backend|stonks|all] [options]

Options:
  --dry-run       Run every check and print the plan, change nothing
  --status        Show what is deployed right now and exit
  --remote-build  Build the frontend on the VPS too (CPU- and memory-capped,
                  hard timeout). For when Docker is unavailable locally.
  --no-pull       Ship the image without touching the remote checkout. For when
                  that checkout holds work in progress — the image is built here
                  and self-contained, so the container does not need it. Note
                  that anything running from the checkout rather than the image
                  (the stonks collectors, for one) then stays as it is.
  --yes           Skip the confirmation prompt
  -h, --help      This text

All three images are built here and shipped. `all` deploys stonks first: it
serves the Market API the other two read from. A backend checkout without a
.dockerignore that excludes .env falls back to building on the VPS, because
such an image would bake this machine's configuration.

Environment overrides:
  OMXSUM_REMOTE          ssh target            (default: root@omxsum.com)
  OMXSUM_REMOTE_DIR      compose directory     (default: /root/newsweb)
  OMXSUM_BACKEND_DIR     newsbackend checkout  (default: ../newsbackend)
  OMXSUM_STONKS_DIR      stonks checkout       (default: ~/stonks)
  OMXSUM_SITE_URL        public URL to verify  (default: https://omxsum.com)
  OMXSUM_PLATFORM        image platform        (default: linux/arm64)

What it does, per service:
  1. Checks this checkout is clean, on the deploy branch and pushed
  2. Checks the VPS: reachable, clean checkout, load, memory, disk
  3. Pulls on the VPS so its source matches what is being shipped
  4. Builds the image here, ships it over ssh, loads it there
  5. Tags the running image as :rollback, then recreates the container
  6. Reloads nginx (it caches upstream container IPs)
  7. Verifies the public site, and rolls back if it does not come up
EOF
}

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m  ✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m  !\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m  ✗ %s\033[0m\n' "$*" >&2; exit 1; }

remote() { ssh "${SSH_OPTS[@]}" "$REMOTE" "$@"; }

# Service definitions. stonks is its own compose project in its own checkout —
# it serves the Market API both other services read from, so it deploys first
# when it is part of the same change.
service_repo() {
    case "$1" in
        frontend) printf '%s' "$FRONTEND_DIR" ;;
        backend)  printf '%s' "$BACKEND_DIR" ;;
        stonks)   printf '%s' "$STONKS_DIR" ;;
    esac
}
# What docker builds: usually the repo, but stonks-web is one app inside its repo.
service_dir() {
    case "$1" in
        stonks) printf '%s/web' "$(service_repo "$1")" ;;
        *)      service_repo "$1" ;;
    esac
}
service_branch() {
    case "$1" in
        frontend) printf 'nextjs' ;;
        backend)  printf 'main' ;;
        stonks)   printf 'master' ;;
    esac
}
service_remote_dir() {
    case "$1" in
        stonks) printf '%s' "$STONKS_REMOTE_DIR" ;;
        *)      printf '%s/%s' "$REMOTE_DIR" "$1" ;;
    esac
}
# Where `docker compose` runs for this service.
service_compose_dir() {
    case "$1" in
        stonks) printf '%s' "$STONKS_REMOTE_DIR" ;;
        *)      printf '%s' "$REMOTE_DIR" ;;
    esac
}
service_compose_name() {
    case "$1" in
        stonks) printf 'stonks-web' ;;
        *)      printf '%s' "$1" ;;
    esac
}
service_image() {
    case "$1" in
        stonks) printf 'stonks-stonks-web' ;;
        *)      printf '%s-%s' "$COMPOSE_PROJECT" "$1" ;;
    esac
}

# Where each image may be built.
#
# frontend: here. Its build is the heavy one, and the runtime image copies only
# public/ and .next/, so no local config travels with it — the API URL is fixed
# by ENV in the Dockerfile, which Next prefers over any .env file.
#
# backend: here too, but only since its .dockerignore stopped the image from
# carrying .env — the container now receives that file from the host. Before
# that, `COPY . .` baked whatever .env sat beside it, so a local build shipped
# the developer's dev config and the container came up unable to serve. A
# checkout without that .dockerignore falls back to building on the VPS, and
# either way assert_image_clean re-checks the built image rather than trusting
# this decision.
#
# stonks: here. It takes its configuration from compose environment variables
# and its .dockerignore already excludes node_modules and .next, so the image
# carries nothing machine-specific.
service_build_mode() {
    case "$1" in
        frontend|stonks) [[ "$REMOTE_BUILD" -eq 1 ]] && printf 'remote' || printf 'local' ;;
        backend)
            if [[ "$REMOTE_BUILD" -eq 1 ]] || ! grep -qxF '.env' "$BACKEND_DIR/.dockerignore" 2>/dev/null; then
                printf 'remote'
            else
                printf 'local'
            fi
            ;;
    esac
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        frontend|backend|stonks) TARGETS+=("$1") ;;
        all) TARGETS=(stonks backend frontend) ;;
        --dry-run) DRY_RUN=1 ;;
        --status) STATUS_ONLY=1 ;;
        --remote-build) REMOTE_BUILD=1 ;;
        --no-pull) SKIP_PULL=1 ;;
        --yes|-y) ASSUME_YES=1 ;;
        -h|--help) usage; exit 0 ;;
        *) usage; die "Unknown argument: $1" ;;
    esac
    shift
done

[[ ${#TARGETS[@]} -gt 0 ]] || TARGETS=(frontend backend)

# ---------------------------------------------------------------- status ----

show_status() {
    log "Deployed right now"
    remote "for repo in '$REMOTE_DIR/frontend' '$REMOTE_DIR/backend' '$STONKS_REMOTE_DIR'; do
        printf '%-9s %s  %s\n' \"\$(basename \$repo)\" \
            \"\$(git -C \$repo rev-parse --short HEAD)\" \
            \"\$(git -C \$repo log -1 --format=%s | cut -c1-58)\"
    done
    echo
    docker ps --format '  {{.Names}}\t{{.Image}}\t{{.Status}}'
    echo
    uptime"
    for target in "${TARGETS[@]}"; do
        local dir; dir="$(service_repo "$target")"
        [[ -d "$dir" ]] || continue
        printf '  local %-9s %s\n' "$target" "$(git -C "$dir" rev-parse --short HEAD)"
    done
}

# -------------------------------------------------------------- preflight ---

check_local() {
    local target="$1" dir branch head upstream
    dir="$(service_repo "$target")"
    [[ -n "$dir" && -d "$dir" ]] || die "$target: checkout not found (set OMXSUM_BACKEND_DIR)"
    branch="$(service_branch "$target")"

    [[ "$(git -C "$dir" rev-parse --abbrev-ref HEAD)" == "$branch" ]] \
        || die "$target: expected branch $branch, on $(git -C "$dir" rev-parse --abbrev-ref HEAD)"
    [[ -z "$(git -C "$dir" status --porcelain)" ]] \
        || die "$target: uncommitted changes — commit or stash before deploying"

    git -C "$dir" fetch --quiet origin "$branch"
    head="$(git -C "$dir" rev-parse HEAD)"
    upstream="$(git -C "$dir" rev-parse "origin/$branch")"
    [[ "$head" == "$upstream" ]] \
        || die "$target: HEAD and origin/$branch differ — push (or pull) first"

    ok "$target: $branch clean and pushed at $(git -C "$dir" rev-parse --short HEAD)"
}

check_remote() {
    local info load free_mem free_disk
    info="$(remote "uptime | sed 's/.*load average: //' | cut -d, -f1;
                    free -m | awk '/^Mem:/ {print \$7}';
                    df -m / | awk 'NR==2 {print \$4}';
                    docker ps --format '{{.Names}}' | tr '\n' ' '")" \
        || die "cannot reach $REMOTE over ssh"

    load="$(sed -n 1p <<<"$info" | tr -d ' ')"
    free_mem="$(sed -n 2p <<<"$info")"
    free_disk="$(sed -n 3p <<<"$info")"
    local containers; containers="$(sed -n 4p <<<"$info")"

    awk -v l="$load" -v m="$MAX_LOAD" 'BEGIN { exit !(l < m) }' \
        || die "remote load average is $load (limit $MAX_LOAD) — wait for it to settle"
    [[ "$free_disk" -ge "$MIN_FREE_DISK_MB" ]] \
        || die "remote disk has ${free_disk}MB free, need ${MIN_FREE_DISK_MB}MB for the image"
    for required in nginx frontend backend; do
        [[ "$containers" == *"$required"* ]] || warn "container '$required' is not running"
    done

    ok "remote reachable · load $load · ${free_mem}MB free · ${free_disk}MB disk"
}

check_remote_checkout() {
    local target="$1" remote_dir; remote_dir="$(service_remote_dir "$target")"
    local dirty; dirty="$(remote "git -C '$remote_dir' status --porcelain | head -3")"
    [[ -z "$dirty" ]] || die "$target: remote checkout has local changes:
$dirty"
}

# ------------------------------------------------------------------ steps ---

pull_remote() {
    local target="$1" remote_dir branch
    remote_dir="$(service_remote_dir "$target")"
    branch="$(service_branch "$target")"
    remote "git -C '$remote_dir' fetch --quiet origin '$branch' && git -C '$remote_dir' merge --ff-only 'origin/$branch' >/dev/null" \
        || die "$target: remote fast-forward failed"
    ok "$target: remote at $(remote "git -C '$remote_dir' rev-parse --short HEAD")"
}

# Both of these failures survive every HTTP check. A bundle built against a dev
# API renders perfectly server-side and only breaks in the visitor's browser,
# and a baked .env produces a container that either serves the wrong data or
# refuses to start — after the swap, when it is already live.
assert_image_clean() {
    local target="$1" image; image="$(service_image "$target")"
    case "$target" in
        frontend)
            docker run --rm --entrypoint sh "$image:latest" \
                -c "grep -rlE 'localhost:[0-9]+|127\.0\.0\.1' .next/static 2>/dev/null | head -1" | grep -q . \
                && die "$target: the built bundle references a local API — check NEXT_PUBLIC_API_URL; nothing was shipped"
            ok "$target: bundle points at the production API"
            ;;
        backend)
            docker run --rm --entrypoint sh "$image:latest" -c 'ls .env >/dev/null 2>&1' \
                && die "$target: the image carries a .env — it must come from the host at runtime; nothing was shipped"
            ok "$target: image carries no configuration"
            ;;
    esac
    return 0
}

build_and_ship() {
    local target="$1" dir image
    dir="$(service_dir "$target")"
    image="$(service_image "$target")"

    log "$target: building $image for $PLATFORM here"
    docker buildx build --platform "$PLATFORM" --load -t "$image:latest" "$dir" \
        || die "$target: local build failed — nothing on the VPS was touched"

    assert_image_clean "$target"

    local size; size="$(docker image inspect "$image:latest" --format '{{.Size}}')"
    log "$target: shipping $(( size / 1024 / 1024 ))MB to $REMOTE"
    docker save "$image:latest" | gzip -1 | remote "gunzip | docker load" \
        || die "$target: image transfer failed — the running container is untouched"
    ok "$target: image loaded on the VPS"
}

build_remote() {
    local target="$1" image remote_dir
    image="$(service_image "$target")"
    remote_dir="$(service_remote_dir "$target")"

    # Capped so a build can never take the machine down again: one core, bounded
    # memory, and a hard timeout. The classic builder is used because it is the
    # one that accepts these limits.
    log "$target: building on the VPS (cpuset $REMOTE_BUILD_CPUS, $REMOTE_BUILD_MEMORY, ${REMOTE_BUILD_TIMEOUT}s timeout)"
    remote "cd '$remote_dir' && DOCKER_BUILDKIT=0 timeout $REMOTE_BUILD_TIMEOUT \
        docker build --cpuset-cpus '$REMOTE_BUILD_CPUS' \
                     --memory '$REMOTE_BUILD_MEMORY' --memory-swap '$REMOTE_BUILD_MEMORY' \
                     -t '$image:latest' ." \
        || die "$target: remote build failed or timed out — the running container is untouched"
    ok "$target: image built on the VPS"
}

# Must run before the new image is loaded: loading reuses the :latest tag, so
# afterwards there would be no name left pointing at the image that works.
#
# The rollback point is the image the container is *running*, not whatever
# :latest happens to name. Those drift apart — an interrupted `compose build`
# can leave :latest pointing at an image no container ever ran.
tag_rollback() {
    local target="$1" image running
    image="$(service_image "$target")"
    running="$(remote "docker inspect -f '{{.Image}}' '$(service_compose_name "$target")' 2>/dev/null" || true)"
    if [[ -n "$running" ]]; then
        remote "docker tag '$running' '$image:rollback'"
        ok "$target: rollback point is the running image ${running:7:12}"
    else
        warn "$target: no running container — nothing to roll back to"
    fi
}

swap_container() {
    local target="$1"
    log "$target: recreating the container"
    remote "cd '$(service_compose_dir "$target")' && docker compose up -d --no-build --force-recreate '$(service_compose_name "$target")'" \
        || die "$target: compose up failed"
}

reload_nginx() {
    # nginx resolves the upstream container IPs once at start, so a recreated
    # container is invisible to it until this runs. Config is checked first so a
    # broken file cannot take nginx down with it.
    remote "docker exec nginx nginx -t >/dev/null 2>&1 && docker exec nginx nginx -s reload" \
        || die "nginx reload failed — check 'docker exec nginx nginx -t'"
    ok "nginx reloaded"
}

verify_site() {
    local paths=("/" "/aktie/ERIC-B.ST" "/api/feed/companies")
    local attempt path code
    for path in "${paths[@]}"; do
        for attempt in 1 2 3 4 5 6; do
            code="$(curl -s -o /dev/null -m 25 -w '%{http_code}' "${SITE_URL}${path}" || true)"
            [[ "$code" == "200" ]] && break
            sleep 5
        done
        [[ "$code" == "200" ]] || { warn "verification failed: $path returned $code"; return 1; }
        ok "$path → 200"
    done
    return 0
}

rollback() {
    local target="$1" image; image="$(service_image "$target")"
    warn "$target: rolling back to the previous image"
    remote "docker image inspect '$image:rollback' >/dev/null 2>&1" \
        || die "$target: no rollback image exists — fix forward"
    remote "docker tag '$image:rollback' '$image:latest' && cd '$(service_compose_dir "$target")' && docker compose up -d --no-build --force-recreate '$(service_compose_name "$target")'"
    reload_nginx
    if verify_site; then
        die "$target: deploy failed and was rolled back; the site is serving the previous image"
    fi
    die "$target: deploy failed AND rollback did not verify — the site needs attention now"
}

# ------------------------------------------------------------------- main ---

if [[ "$STATUS_ONLY" -eq 1 ]]; then
    show_status
    exit 0
fi

log "Preflight"
for target in "${TARGETS[@]}"; do check_local "$target"; done
check_remote
[[ "$SKIP_PULL" -eq 1 ]] || for target in "${TARGETS[@]}"; do check_remote_checkout "$target"; done

needs_local_build=0
for target in "${TARGETS[@]}"; do
    [[ "$(service_build_mode "$target")" == "local" ]] && needs_local_build=1
done
if [[ "$needs_local_build" -eq 1 ]]; then
    docker version >/dev/null 2>&1 \
        || die "local Docker is not running (start Docker Desktop, or use --remote-build)"
    ok "local Docker ready"
fi

echo
log "Plan"
for target in "${TARGETS[@]}"; do
    printf '  %-9s %s → %s  (%s)\n' "$target" \
        "$(remote "git -C '$(service_remote_dir "$target")' rev-parse --short HEAD")" \
        "$(git -C "$(service_repo "$target")" rev-parse --short HEAD)" \
        "$([[ "$(service_build_mode "$target")" == "remote" ]] && echo 'build on VPS, capped' || echo 'build here, ship image')"
done
echo

if [[ "$DRY_RUN" -eq 1 ]]; then
    ok "dry run — nothing changed"
    exit 0
fi

if [[ "$ASSUME_YES" -eq 0 ]]; then
    read -r -p "Deploy ${TARGETS[*]} to $REMOTE? [y/N] " answer
    [[ "$answer" == "y" || "$answer" == "Y" ]] || die "cancelled"
fi

# One deploy at a time. noclobber makes the create fail if the file is there,
# and the trap releases it however this script exits.
LOCK_FILE=/tmp/omxsum-deploy.lock
remote "set -o noclobber; echo \"\$(date -u +%FT%TZ) $USER\" > $LOCK_FILE" 2>/dev/null \
    || die "another deploy holds $LOCK_FILE on $REMOTE ($(remote "cat $LOCK_FILE" 2>/dev/null)). Remove it if that deploy is dead."
trap 'remote "rm -f $LOCK_FILE" >/dev/null 2>&1 || true' EXIT

for target in "${TARGETS[@]}"; do
    echo
    log "Deploying $target"
    if [[ "$SKIP_PULL" -eq 1 ]]; then
        warn "$target: remote checkout left untouched (--no-pull)"
    else
        pull_remote "$target"
    fi
    tag_rollback "$target"
    if [[ "$(service_build_mode "$target")" == "remote" ]]; then
        build_remote "$target"
    else
        build_and_ship "$target"
    fi
    swap_container "$target"
    reload_nginx
    if ! verify_site; then
        rollback "$target"
    fi
done

echo
log "Done"
# Dangling layers from previous builds pile up on a 38GB disk. The rollback
# images are tagged, so they survive this.
remote "docker image prune -f >/dev/null 2>&1 || true"
remote "docker ps --format '  {{.Names}}\t{{.Image}}\t{{.Status}}'; uptime"
