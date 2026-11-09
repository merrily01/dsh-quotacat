# dsh-quotacat

QuotaCat for DeepSeek Harness — LLM 服务商用量与额度监控插件。

当前支持 **GLM Coding Plan**（5h 窗口 / 月度 MCP / 套餐等级 / 24h 工具调用），更多 provider 持续接入中。


## 功能

- **输入框统计条 pill**：`额度 62%`，百分比按用量分级变色（绿 <60 / 黄 <85 / 红 ≥85），点击弹出详情面板
- **详情面板**：套餐等级、5 小时 token 窗口、本月 MCP 工具用量细分、重置时间，手动刷新
- **`quota` agent 工具**：对话中直接问"额度还剩多少"即可触发
- **右下角悬浮球**：🐱 常驻指示 + 展开面板（旧入口，可按需关闭）

## 零配置

插件自动通过宿主凭据服务解析 `ZAI_CODING_CN_API_KEY`（DSH 登录 GLM Coding Plan 时自动存入），无需手动配置 API Key。备选顺序：插件配置 `apiKey` → 宿主凭据 → 环境变量（`QUOTACAT_API_KEY` / `GLM_API_KEY` / `ZHIPU_API_KEY`）。

## 指示器跟随模型

监听宿主 `llm/stream` 事件，按会话记录实际使用的 provider；pill 在当前模型不属于 GLM 家族时半透明置灰。

> 已知局限：客户端无法感知"模型选择器"的当前值，只能跟随实际发生的调用。这是向 DSH 社区提案的方向之一（`conversation.model.changed` 事件 / `model-state` 客户端服务）。

## 开发

```bash
npm install
npm run check     # typecheck + build
npm test          # placePanel 定位纯函数 + slot 注册单测
```

### 提交规范（Conventional Commits）

```
<type>: <英文祈使句主题，不加句号>

<body 可选：bullet 说明 what/why>
```

类型限定 `feat` / `fix` / `docs` / `test` / `refactor` / `chore` / `perf`；主题与正文一律英文；一个提交只做一件事。

本地安装到 profile（`~/.dsh/profiles/desktop/package.json`）：

```json
{ "dependencies": { "dsh-quotacat": "file:<本项目路径>" } }
```

再在 profile 的 `cordis.patch.yml` 加插件行（见 `cordis.patch.yml`）。

## 结构

```
src/index.ts              host 侧：GLM 查询/缓存/HTTP 路由/quota 工具
src/glm.ts                GLM API 客户端
src/shared/api.ts         类型与路由常量（host/client 共用）
src/client.tsx            浏览器模块入口（ModuleLoader 格式）
src/client/main.tsx       client 装配：locale + composer dock pill
src/client/QuotaCatFooter.ts   pill + 详情面板
src/client/anchoredPosition.ts 面板定位纯函数（含单测）
src/client/registerQuota.ts    slot 注册
src/client/runtime.ts     React/react-dom/require 运行时注入容器
src/client/model.ts       host API 封装
src/client/styles.ts      主题变量样式（对齐宿主 stat-dialog 规格）
```

## License

MIT
