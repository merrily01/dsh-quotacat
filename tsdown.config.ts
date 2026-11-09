import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    // host 侧：cordis 插件入口（Node ESM；peer deps 不参与打包）
    entry: ['src/index.ts'],
    format: 'esm',
    platform: 'node',
    sourcemap: false,
    dts: false,
    deps: { neverBundle: [/^@deepseek-ai\//, /^node:/] },
    outExtensions: () => ({ js: '.js' }),
  },
  {
    // client 侧：浏览器脚本，保持 window.__ModuleLoader__.load(...) 的
    // 立即执行形态；react 由 harness 加载器运行时提供，不参与打包。
    entry: ['src/client.tsx'],
    format: 'iife',
    platform: 'browser',
    sourcemap: false,
    minify: false,
    outputOptions: { entryFileNames: 'client.js' },
  },
])
