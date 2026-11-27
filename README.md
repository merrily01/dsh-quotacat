# dsh-quotacat

QuotaCat for DeepSeek Harness — LLM 服务商用量与额度监控插件。

已支持：

- **GLM Coding Plan**：5h 窗口 / 月度 MCP / 套餐等级 / 24h 工具调用
- **DeepSeek API**（计费账户）：余额 / 赠送金 / 账户状态

更多 provider 持续接入中。

## 功能

### 输入框统计条额度 pill

在输入框下方统计条（轮次/步数、tok/s、缓存命中那一行）的末尾追加一个额度 pill：

- 显示当前服务商的 5 小时窗口用量百分比，按用量分级变色（绿 <60% / 黄 <85% / 红 ≥85%）
- **跟随当前模型**：GLM 显示 5h 百分比，DeepSeek 显示 API 余额；切换到未支持的服务商时半透明置灰
- 点击弹出详情面板（与宿主统计 pill 同款交互：固定定位、Esc/点外部关闭）：
  - 套餐等级、5h 窗口（用量/重置时间，跨天带日期）
  - 24 小时滚动工具调用 + 本月 MCP 工具细分
  - 手动刷新、数据更新时间

### 阈值提醒

5h 用量达到阈值（默认 80%，可调 50–95%）时弹出全局提醒 Toast，回落到阈值下方后自动复位（同一窗口只提醒一次）。阈值与开关可在设置视图里调整。

### `quota` agent 工具

对话中直接问「额度还剩多少」「5h 窗口什么时候重置」，agent 自动调用 `quota` 工具返回结果。

### 设置

pill 弹框内切换设置视图：刷新频率（1–60 分钟或仅手动）、阈值提醒开关与阈值。配置热生效，无需重启。

## 零配置

无需手动配置 API Key：

- **GLM Coding Plan**：自动解析 `ZAI_CODING_CN_API_KEY`（DSH 登录时自动存入）
- **DeepSeek API**：解析 `DEEPSEEK_API_KEY`（API 计费账户的 key；订阅登录无公开余额接口）
- 兜底顺序：宿主凭据 → 环境变量（对应各家的 `*_API_KEY`）

## 安装

```bash
# 在 DSH profile 目录（~/.dsh/profiles/<profile>）里：
pnpm add dsh-quotacat
```

再在 profile 的 `cordis.patch.yml` 末尾追加：

```yaml
- insert:
    - id: quotacat
      name: dsh-quotacat
```

重启 DSH 生效。

## 指示器跟随模型的已知局限

DSH 客户端目前无法感知「模型选择器」的当前值，插件只能跟随**实际发生**的模型调用（监听 `llm/stream` 事件，按会话记录）。同时开多个会话使用不同模型时，pill 显示最近活跃的一家。

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

### 结构

```
src/index.ts              host 侧：查询/缓存/HTTP 路由/quota 工具/阈值
src/glm.ts                GLM API 客户端（额度 + 24h 工具用量）
src/shared/api.ts         类型与路由常量（host/client 共用）
src/client.tsx            浏览器模块入口（ModuleLoader 格式）
src/client/main.tsx       client 装配：locale + pill + toast
src/client/QuotaCatFooter.ts    pill + 详情/设置双视图弹框
src/client/QuotaAlertToast.ts   阈值提醒 Toast
src/client/anchoredPosition.ts  面板定位纯函数（含单测）
src/client/registerQuota.ts     slot 注册
src/client/runtime.ts     React/react-dom/require 运行时注入容器
src/client/model.ts       host API 封装
src/client/styles.ts      主题变量样式（对齐宿主 stat-dialog 规格）
```

## License

MIT
