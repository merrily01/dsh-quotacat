# QuotaCat 阈值 Toast 设计

## 意图

额度达到用户设定阈值时，在 DSH 内主动展示一次原生警告 Toast，而不是只在用户主动打开详情后显示警示。

## 方案

- 在全局 `shell.overlay` slot 注册 QuotaCat Toast 组件，直接复用 `@deepseek-ai/dsh-client-ui-primitives` 的 `Toast` 和警告图标。
- 客户端轮询现有额度报告；`threshold.triggered` 从 false 进入 true 时展示一次 Toast。
- 持续处于 true 时不重复；回到 false 后重新布防。
- Toast 停留约 8 秒，提供“查看额度”操作；详情中的黄色警示保持不变。
- 不增加系统通知、自定义通知卡片或模态弹窗。

## 非目标

- 不实现 macOS 通知权限与后台通知。
- 不新增提醒历史或多级阈值。
