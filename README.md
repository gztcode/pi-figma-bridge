# codex-figma-cli

> 一个独立 CLI，把 Codex CLI 自带的 `figma@openai-api-curated` 插件暴露的 45 个 Figma MCP 工具打包成可脚本化命令，无需启动 Codex TUI。

**调用链**：`figma-cli` → spawn `codex app-server` → JSON-RPC v2 → figma MCP server (`https://mcp.figma.com/mcp`) → Figma Plugin API（设计生成/编辑）或 REST（注释/资源）。

**典型用途**：从 CI / cron / 其它工具里调 Figma；用脚本批量跑 Figma 任务；把 Figma 操作嵌进更大的工作流。

---

## 安装

前置条件：
- macOS / Linux
- Python 3.9+（无第三方依赖，纯标准库）
- 已安装 [Codex CLI](https://github.com/openai/codex) 并登录
- Codex CLI 已启用 `figma@openai-api-curated` 插件（默认即启用）
- Figma OAuth 已通过 Codex 完成（首次执行会自动弹浏览器）

```bash
git clone https://github.com/gztcode/codex-figma-cli.git
cd codex-figma-cli
chmod +x figma-cli
ln -s "$(pwd)/figma-cli" ~/.local/bin/figma-cli   # 或复制到任何 $PATH 目录
```

验证：

```bash
figma-cli status
# Server: figma
#   authStatus:    oAuth
#   runtimeStatus: None
#   pluginId:      figma@openai-api-curated
#   httpOrigin:    https://mcp.figma.com
#   tools:         45
```

---

## 用法

```bash
figma-cli status                                  # 查 server 状态 / 认证
figma-cli tools                                   # 列出全部 45 工具
figma-cli schema <tool>                           # 查 inputSchema（JSON）
figma-cli call <tool> '<json-args>'               # 调工具（JSON 模式）
figma-cli call <tool> [k=v ...]                   # 调工具（k=v 简化模式）
```

### 调工具的两种参数写法

```bash
# JSON 模式（适合复杂 / 多行参数）
figma-cli call create_new_file '{"fileName":"My Design","editorType":"design","planKey":"team::YOUR_PLAN_KEY"}'

# k=v 简化模式（值会当 string 传；number / bool / object 用 JSON 模式）
figma-cli call create_new_file fileName=MyDesign editorType=design planKey=team::YOUR_PLAN_KEY
```

### 典型工作流

**1. 拿自己的 Figma 身份**

```bash
figma-cli call whoami '{}'
# 你的 handle / email / plan key
```

**2. 建一个新文件**

```bash
figma-cli call create_new_file fileName="My Design" editorType=design planKey=$(figma-cli call whoami '{}' | jq -r .plan_key)
# { file_key, file_url, message }
```

**3. 跑 Plugin API 写设计**（需先读 figma-use skill）

`use_figma` 接收一段 JavaScript，在 Figma Plugin API 环境跑：

```bash
figma-cli call use_figma "$(jq -n --arg code "$(cat /tmp/code.js)" \
  '{fileKey:"FILE_KEY",code:$code,description:"Create a login card"}')"
```

**4. 截图已有节点**

```bash
figma-cli call get_screenshot '{"fileKey":"FILE_KEY","nodeId":"1:2","maxDimension":1024}'
# 返回 image_url + width/height
```

`maxDimension` 之类需要 number 的字段必须用 JSON 模式（k=v 会当 string，Figma 会拒）。

---

## 工作原理

1. **启动** `codex app-server`（stdio transport，Codex 自带的 JSON-RPC 守护进程）
2. **握手** `initialize` (v1) → `notifications/initialized`（v1 → v2 协议切换点）
3. **轮询** `mcpServerStatus/list` 直到 figma server 出现且 tools 加载完（首次 ~15s，因为 figma 走远程 OAuth + 异步加载 45 个工具）
4. **启动 thread** `thread/start { cwd, approvalPolicy: "never", sandbox: "read-only" }` 拿 `threadId`
5. **调工具** `mcpServer/tool/call { server: "figma", tool, arguments, threadId }`
6. **退出** stdin EOF → SIGTERM → wait

```json
// 一次调用的 JSON-RPC 序列
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"clientInfo":{"name":"figma-cli","version":"1.0.0"},"capabilities":{}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"thread/start","params":{"cwd":".","approvalPolicy":"never","sandbox":"read-only"}}
{"jsonrpc":"2.0","id":3,"method":"mcpServer/tool/call","params":{"server":"figma","tool":"whoami","arguments":{},"threadId":"<thread-id>"}}
```

完整 schema 用 `figma-cli schema <tool>` 看。

---

## 工具清单

`figma-cli tools` 列出 45 个工具，几个高价值的：

| 工具 | 用途 |
| --- | --- |
| `whoami` | 查 Figma 身份 / plan / OAuth 状态 |
| `create_new_file` | 建新 Figma 文件 |
| `use_figma` | **万能**：传 JS 在 Figma Plugin API 里跑（创建/编辑/查节点） |
| `get_screenshot` | 截节点渲染图（返回 short-lived URL + curl 命令） |
| `get_design_context` | 读节点的设计上下文（结构、变量、样式） |
| `generate_diagram` | AI 生流程图 / 架构图 / 时序图 |
| `generate_image` | AI 生图片 |
| `html_to_figma` | HTML → Figma 节点（像素级） |
| `generate_figma_design` | 抓活网页到 Figma |
| `download_assets` / `upload_assets` | 资产下载 / 上传 |

---

## 环境变量

| 变量 | 默认 | 用途 |
| --- | --- | --- |
| `FIGMA_CLI_VERBOSE=1` | off | 打印 JSON-RPC 调试输出 + codex stderr |
| `FIGMA_CLI_TIMEOUT=N` | 180 | 工具调用超时（秒），复杂 `use_figma` / `create_new_file` 需 120-180s |

---

## 故障排查

**`codex` 不在 PATH**
```
错误: 'codex' 不在 PATH
```
装 Codex CLI：`brew install --cask codex`（或见 [openai/codex](https://github.com/openai/codex)）

**`initialize 失败`**
Codex 没装好或版本不兼容。试 `codex --version` 确认 `0.160+`。

**`figma MCP server 不在 status 列表里`**
- 确认 `~/.codex/config.toml` 的 `[plugins]` 里有 `figma@openai-api-curated`
- `codex mcp list` 应该有 figma 行 enabled + OAuth
- 没登录：`codex mcp login figma`（会弹浏览器走 Figma OAuth）

**OAuth metadata discovery 失败**
间歇性，重试一次。

**timeout after 180s**
大 `use_figma` 脚本（30+ 节点）可能需要更久：`FIGMA_CLI_TIMEOUT=300 figma-cli call ...`

---

## 为什么存在

Codex CLI 的 `figma@openai-api-curated` 插件在 `codex exec` 模式下 **不会** 注入 MCP 工具到 session（实测，只有 Codex TUI/Desktop/app-server 路径能拿到这些工具）。这个 CLI 直接驱动 `codex app-server` 的 JSON-RPC 接口，让非 Codex 上下文也能用 Figma MCP。

另一个场景：自动化流水线。`codex exec` 跑一次要 5-30s 启动模型，这个 CLI 只 spawn daemon + 发 JSON-RPC，单调用 1-3s。

---

## 它本身在干嘛

这个工具的开发本身就是一个 AI agent（[Pi](https://github.com/badlogic/pi-coding-agent)）通过 Figma Plugin API 画了第一个测试卡片后，封装发布到 GitHub 的完整流程示例。

---

## License

MIT
