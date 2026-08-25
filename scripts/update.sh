#!/usr/bin/env bash

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories to skip inside examples
SKIP_DIRS=(
)

# Directories that should skip migrations inside examples
SKIP_MIGRATIONS_DIRS=(
)

# The package table, shared with test-and-bump.sh and the JS scripts
# shellcheck source=./packages.sh
source "$(dirname "${BASH_SOURCE[0]}")/packages.sh"

# Function to print script messages
log() {
    local dir=$1
    local msg=$2
    echo -e "\n${BLUE}=== [$dir] $msg ===${NC}\n"
}

# Function to print success messages
success() {
    local dir=$1
    local msg=$2
    echo -e "\n${GREEN}✓ [$dir] $msg${NC}\n"
}

# Function to print warning messages
warning() {
    local dir=$1
    local msg=$2
    echo -e "\n${YELLOW}⚠ [$dir] $msg${NC}\n"
}

# Function to print error messages
error() {
    local dir=$1
    local msg=$2
    echo -e "\n${RED}✗ [$dir] $msg${NC}\n"
}

# Function to check if a directory should be skipped
should_skip() {
    local dir=$1
    local dirname=$(basename "examples/$dir")
    for skip_dir in "${SKIP_DIRS[@]}"; do
        if [ "$dirname" = "$skip_dir" ]; then
            return 0
        fi
    done
    return 1
}

# Check if version argument is provided
if [ -z "$1" ]; then
    error "" "Please provide a version number"
    echo "Usage: ./update.sh <version> [start_directory] [-s|--single] [--skip-build]"
    exit 1
fi

VERSION=$1
SINGLE_DIR=false
SKIP_BUILD=false
shift  # Remove version from arguments

# Parse remaining arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--single)
            SINGLE_DIR=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        *)
            if [ -z "$START_DIR" ]; then
                START_DIR=./examples/$1
            fi
            shift
            ;;
    esac
done

# Get the parent directory of the start directory
if [ -z "$START_DIR" ]; then
    # If no start directory provided, find the first non-hidden directory
    START_DIR=$(find ./examples -maxdepth 1 -type d -not -path "*/\.*" -not -path "." | sort | head -n 2 | tail -n 1)
    if [ -z "$START_DIR" ]; then
        error "" "No valid directories found"
        exit 1
    fi
    PARENT_DIR="./examples"
else
    PARENT_DIR=$(dirname "$START_DIR")
fi

log "" "Starting from directory: $START_DIR"
if [ "$SINGLE_DIR" = true ]; then
    log "" "Single directory mode: Only updating $START_DIR"
fi

# Function to handle errors
handle_error() {
    error "$1" "Error occurred in directory"
    warning "$1" "Last successful directory: $2"
    echo -e "To resume from this directory, run: ${YELLOW}./update.sh $VERSION $1${NC}"
    exit 1
}

# Bump every @medusajs dependency except @medusajs/ui in one project's package.json
bump_manifest() {
    local dir=$1
    local root_pwd
    root_pwd=$(pwd)

    if ! grep -q "\"@medusajs" "$dir/package.json"; then
        warning "$dir" "No @medusajs packages found, skipping..."
        return 0
    fi

    log "$dir" "Updating @medusajs packages to version $VERSION"
    cd "$dir" || handle_error "$dir" "$LAST_SUCCESSFUL_DIR"

    echo -e "\n${YELLOW}[$dir] Running: yarn add ...${NC}\n"
    yarn add $(grep "\"@medusajs" package.json | grep -v "\"@medusajs/ui\"" | sed 's/.*"@medusajs\/\([^"]*\)".*/@medusajs\/\1@'"$VERSION"'/') || handle_error "$dir" "$LAST_SUCCESSFUL_DIR"

    # Remove all empty lines and ensure no trailing newline
    if sed --version > /dev/null 2>&1; then
        sed -i -e '/^[[:space:]]*$/d' package.json || handle_error "$dir" "$LAST_SUCCESSFUL_DIR"
    else
        sed -i '' -e '/^[[:space:]]*$/d' package.json || handle_error "$dir" "$LAST_SUCCESSFUL_DIR"
    fi
    perl -i -pe 'chomp if eof' package.json || handle_error "$dir" "$LAST_SUCCESSFUL_DIR"

    cd "$root_pwd" || handle_error "$dir" "$LAST_SUCCESSFUL_DIR"
}

# Every project manifest of an example: the root of a monorepo example, the Medusa app and
# any storefront. node_modules, build output and vendored .yalc copies are not projects.
example_manifests() {
    find "$1" -name package.json \
        -not -path '*/node_modules/*' \
        -not -path '*/.medusa/*' \
        -not -path '*/.next/*' \
        -not -path '*/dist/*' \
        -not -path '*/.yalc/*' | sort
}

# Function to process an example
process_directory() {
    local example_dir="$1"
    local app_dir="$1/$2"
    local root_pwd
    root_pwd=$(pwd)
    log "$example_dir" "Processing example"

    # Bump every project of the example, not just the Medusa app
    local manifest
    while IFS= read -r manifest; do
        [ -n "$manifest" ] || continue
        bump_manifest "$(dirname "$manifest")"
    done < <(example_manifests "$example_dir")

    # Migrations and the build run where the Medusa app lives
    local example_name app_name app_parent skip_migrations=false
    example_name=$(basename "$example_dir")
    app_name=$(basename "$app_dir")
    app_parent=$(basename "$(dirname "$app_dir")")

    # Check the example itself, the app directory or its parent against SKIP_MIGRATIONS_DIRS
    # (the app directory is `medusa` for most examples but `apps/backend` for a monorepo one)
    for skip_dir in "${SKIP_MIGRATIONS_DIRS[@]}"; do
        if [ "$example_name" = "$skip_dir" ] || [ "$app_name" = "$skip_dir" ] || [ "$app_parent" = "$skip_dir" ]; then
            skip_migrations=true
            warning "$app_dir" "Skipping migrations for this directory"
            break
        fi
    done

    if [ "$SKIP_BUILD" = false ] && grep -q "\"@medusajs" "$app_dir/package.json"; then
        cd "$app_dir" || handle_error "$app_dir" "$LAST_SUCCESSFUL_DIR"

        # Run database migrations if not skipped
        if [ "$skip_migrations" = false ]; then
            log "$app_dir" "Running database migrations"
            echo -e "\n${YELLOW}[$app_dir] Running: npx medusa db:migrate${NC}\n"
            npx medusa db:migrate || handle_error "$app_dir" "$LAST_SUCCESSFUL_DIR"
        fi

        # Build the project
        log "$app_dir" "Building project"
        echo -e "\n${YELLOW}[$app_dir] Running: yarn build${NC}\n"
        yarn build || handle_error "$app_dir" "$LAST_SUCCESSFUL_DIR"

        cd "$root_pwd" || handle_error "$app_dir" "$LAST_SUCCESSFUL_DIR"
    else
        warning "$app_dir" "Skipping migrations and build"
    fi

    # Integration tests are run from the workflow via `yarn turbo` after all version bumps
    # complete. Here we only mirror the bump in the workspace covering this example.
    local it_name
    if it_name=$(example_it "$example_name"); then
        if [ -f "./integration-tests/$it_name/package.json" ]; then
            bump_manifest "./integration-tests/$it_name"
        fi
    fi

    success "$example_dir" "Successfully updated"

    # Store the last successful directory
    LAST_SUCCESSFUL_DIR="$example_dir"

    # Return to the repository root — `cd -` would only toggle between the last two
    # directories and leave the next example unreachable by its relative path
    cd "$root_pwd" || handle_error "$example_dir" "$LAST_SUCCESSFUL_DIR"
}

# Create a temporary file to store directories
TEMP_DIRS=$(mktemp)

# Find and store all directories at the same level
find "$PARENT_DIR" -maxdepth 1 -type d -not -path "*/\.*" -not -path "$PARENT_DIR" | sort > "$TEMP_DIRS"

# Print the list of directories that will be processed
echo -e "\n${BLUE}=== Directories to be processed ===${NC}"
if [ ! -z "$START_DIR" ]; then
    echo -e "${YELLOW}Starting from directory: $START_DIR${NC}"
    echo -e "${YELLOW}Directories after $START_DIR:${NC}"
    while IFS= read -r dir; do
        if [ "$dir" = "$START_DIR" ]; then
            FOUND_START_DIR=true
        elif [ "$FOUND_START_DIR" = true ]; then
            echo -e "  - $dir"
        fi
    done < "$TEMP_DIRS"
else
    while IFS= read -r dir; do
        echo -e "  - $dir"
    done < "$TEMP_DIRS"
fi
echo -e "${BLUE}================================${NC}\n"

# Reset the found start directory flag
FOUND_START_DIR=false

# Store directories in an array
DIRS=()
while IFS= read -r dir; do
    DIRS+=("$dir")
done < "$TEMP_DIRS"

# Process each directory
for dir in "${DIRS[@]}"; do
    # If in single directory mode, only process the specified directory
    if [ "$SINGLE_DIR" = true ] && [ "$dir" != "$START_DIR" ]; then
        continue
    fi

    # If a start directory was specified and we haven't found it yet, check for it
    if [ ! -z "$START_DIR" ] && [ "$FOUND_START_DIR" = false ]; then
        if [ "$dir" = "$START_DIR" ]; then
            # Found the start directory, set a flag to start processing
            FOUND_START_DIR=true
        else
            # Haven't found the start directory yet, skip this directory
            continue
        fi
    fi
    
    # Skip if directory is in the skip list
    if should_skip "$dir"; then
        warning "$dir" "Directory is in skip list, skipping..."
        continue
    fi

    # Process the directory when packages.json declares a Medusa app for it
    if app_sub=$(example_app "$(basename "$dir")" 2>/dev/null); then
        process_directory "$dir" "$app_sub"
    else
        warning "$dir" "Not declared in scripts/packages.json, skipping..."
    fi
done

# Clean up temporary file
rm "$TEMP_DIRS"

success "" "All directories processed successfully!"
