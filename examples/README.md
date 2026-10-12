# Examples

可复用的 figma-cli 调用模板。每个例子都是可以直接运行（部分需替换占位符）。

## 模板清单

| 文件 | 用途 | 类型 |
| --- | --- | --- |
| [`whoami-and-create.sh`](whoami-and-create.sh) | 查身份 + 建新文件 | Bash |
| [`get-screenshot.sh`](get-screenshot.sh) | 抓节点截图 + 自动下载 PNG | Bash |
| [`login-card.js`](login-card.js) | 现代登录卡（auto-layout + 渐变 + 阴影） | `use_figma` JS |
| [`flowchart.js`](flowchart.js) | 5 节点流程图 + 箭头 | `use_figma` JS |

## 跑前准备

```bash
# 1. 装 figma-cli (见根目录 README)
# 2. 确认 codex 已登录 + figma 插件启用
figma-cli status    # 应该看到 authStatus: oAuth, tools: 45
```

## 跑法

**Bash 例子**（参数替换占位符）：

```bash
./whoami-and-create.sh "My Design"
./get-screenshot.sh YOUR_FILE_KEY 1:2 1200
```

**JS 例子**（喂给 `use_figma`，必须先有目标文件）：

```bash
# 1. 拿 fileKey
./whoami-and-create.sh "Design"

# 2. 跑 use_figma
ARGS=$(jq -n --arg code "$(cat login-card.js)" \
  '{fileKey:"YOUR_FILE_KEY",code:$code,description:"Create login card"}')
figma-cli call use_figma "$ARGS"
```

## 加自己的模板

两个流派：

1. **Bash 模板**：组合 `figma-cli call` 调用、解析输出、串联多个工具。适合管道/批处理。
2. **JS 模板**：单段 Figma Plugin API 代码喂给 `use_figma`。适合一次性画/改设计。

JS 模板的硬规则（来自 figma-use skill）：

- **必须** `return` 节点 ID（`return { createdNodeIds: [...] }`）
- **必须** 先 `await figma.loadFontAsync(font)` 再改文字
- 颜色用 0-1（`{r:1, g:0, b:0}` = 红）
- `layoutSizingHorizontal = "FILL"` 必须在 `appendChild` 之后设
- 自动布局用 `figma.createFrame() + layoutMode = "VERTICAL" | "HORIZONTAL"`
- 新节点放在 `figma.currentPage` 已有节点的右侧
- 出错就停 —— 脚本是原子的

完整的 figma-use skill 在 `~/.codex/plugins/cache/openai-api-curated/figma/<ver>/skills/figma-use/SKILL.md`（装 codex 后才有）。
