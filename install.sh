#!/usr/bin/env bash
# install.sh — 一键装 figma-cli 到 ~/.local/bin/
#
# 用法:
#   ./install.sh                 # 装最新 release
#   ./install.sh v1.0.1          # 装指定 tag
#   ./install.sh --uninstall     # 卸载
#
# 也可远程跑: curl -sL https://raw.githubusercontent.com/gztcode/pi-figma-bridge/main/install.sh | bash

set -euo pipefail

REPO="gztcode/pi-figma-bridge"
BIN_NAME="figma-cli"
INSTALL_DIR="${FIGMA_CLI_INSTALL_DIR:-$HOME/.local/bin}"

usage() {
  cat <<EOF
用法: $0 [tag] | --uninstall

默认装最新 release; 传 tag 装指定版本; 传 --uninstall 删 ~/.local/bin/figma-cli
EOF
}

uninstall() {
  local target="$INSTALL_DIR/$BIN_NAME"
  if [ -L "$target" ] || [ -f "$target" ]; then
    rm -f "$target"
    echo "已删: $target"
  else
    echo "没装: $target"
  fi
  exit 0
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then usage; exit 0; fi
if [ "${1:-}" = "--uninstall" ]; then uninstall; fi

TAG="${1:-latest}"

# ---- 算 release tarball URL ----
if [ "$TAG" = "latest" ]; then
  echo "==> 查最新 release"
  RELEASE_JSON=$(curl -sL "https://api.github.com/repos/$REPO/releases/latest")
  TAG=$(echo "$RELEASE_JSON" | grep -m1 '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')
  TARBALL=$(echo "$RELEASE_JSON" | grep -m1 '"tarball_url"' | sed -E 's/.*"tarball_url": *"([^"]+)".*/\1/')
else
  TARBALL="https://api.github.com/repos/$REPO/tarball/$TAG"
fi

if [ -z "$TAG" ] || [ -z "$TARBALL" ]; then
  echo "错误: 找不到 $TAG 的 release" >&2; exit 1
fi

echo "==> 版本: $TAG"
echo "==> 装到: $INSTALL_DIR/$BIN_NAME"

# ---- 装 ----
mkdir -p "$INSTALL_DIR"

WORK=$(mktemp -d)
# shellcheck disable=SC2064  # 故意用单引号，让 $WORK 在 trap 触发时才展开
trap 'rm -rf "$WORK"' EXIT

echo "==> 下载"
curl -sL -o "$WORK/release.tgz" "$TARBALL"

echo "==> 解压"
tar -xzf "$WORK/release.tgz" -C "$WORK"

# 找 figma-cli 脚本 (可能在子目录里)
SRC=$(find "$WORK" -name "figma-cli" -type f | head -1)
if [ -z "$SRC" ]; then
  echo "错误: tarball 里没 figma-cli" >&2; exit 1
fi

install -m 0755 "$SRC" "$INSTALL_DIR/$BIN_NAME"
echo "==> 装好: $INSTALL_DIR/$BIN_NAME"

# ---- PATH 检查 ----
case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *) echo "    注意: $INSTALL_DIR 不在 PATH, 加这一行到 ~/.zshrc 或 ~/.bashrc:
      export PATH=\"\$HOME/.local/bin:\$PATH\"" ;;
esac

# ---- 验证 ----
echo "==> 验证"
"$INSTALL_DIR/$BIN_NAME" --help | head -5
echo "    (下一步: figma-cli status 确认连上 figma MCP server)"
