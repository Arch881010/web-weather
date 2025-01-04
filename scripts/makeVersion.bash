# Props to chatgpt for the script. (I was lazy)

# Navigate to the json directory
cd ../docs/json

# Get the version number from a VERSION file or use a default value
VERSION=$(cat ../VERSION 2>/dev/null || echo "1.0.0")

# Get the most recent commit message and extract the first line
RECENT_COMMIT=$(git log -1 --pretty=%B | head -n 1)

# Generate the version.json file
echo "Generating version.json"
cat <<EOF > version.json
{
    "number": "$VERSION",
    "time-updated": "$(date)",
    "recent-commit": "$RECENT_COMMIT"
}
EOF

echo "version.json generated successfully"