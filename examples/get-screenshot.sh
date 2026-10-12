#!/usr/bin/env bash
# get-screenshot.sh — 抓 Figma 节点截图，自动下载 PNG
#
# 用法: ./get-screenshot.sh <fileKey> <nodeId> [maxDimension]
# 例:   ./get-screenshot.sh M85FcEFxRZwRy68DfGVP3M 2:2 1200
#
# 需先 figma-cli status 确认已连上

set -euo pipefail

FILE_KEY="${1:?usage: $0 <fileKey> <nodeId> [maxDimension]}"
NODE_ID="${2:?usage: $0 <fileKey> <nodeId> [maxDimension]}"
MAX_DIM="${3:-1024}"

echo "==> 抓 $FILE_KEY / $NODE_ID (max ${MAX_DIM}px)"
RESULT=$(figma-cli call get_screenshot \
  "$(jq -nc --arg fk "$FILE_KEY" --arg nid "$NODE_ID" --argjson md "$MAX_DIM" \
    '{fileKey:$fk,nodeId:$nid,maxDimension:$md}')")

echo "$RESULT" | jq .

URL=$(echo "$RESULT" | jq -r '.image_url')
OUT_FILE="screenshot-$(date +%s).png"
echo "==> 下载到 $OUT_FILE"
curl -sL -o "$OUT_FILE" "$URL"
file "$OUT_FILE"
echo "  尺寸: $(sips -g pixelWidth -g pixelHeight "$OUT_FILE" 2>/dev/null | tail -2)"
