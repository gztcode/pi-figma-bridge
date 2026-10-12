#!/usr/bin/env bash
# whoami-and-create.sh — 查身份 + 建一个新文件
#
# 用法: ./whoami-and-create.sh "My Design File"
# 需要: figma-cli 已装到 PATH, codex 已登录并启用 figma 插件

set -euo pipefail

FILE_NAME="${1:-Untitled}"
echo "==> 1. 查 Figma 身份"
PLAN_KEY=$(figma-cli call whoami '{}' | jq -r '.plan_key')
echo "    plan: $PLAN_KEY"

echo "==> 2. 建文件"
RESULT=$(figma-cli call create_new_file "fileName=$FILE_NAME" "editorType=design" "planKey=$PLAN_KEY")
echo "$RESULT" | jq .

FILE_KEY=$(echo "$RESULT" | jq -r '.file_key')
echo "==> 文件已建: https://www.figma.com/design/$FILE_KEY"
echo "$FILE_KEY" > .last-figma-file
