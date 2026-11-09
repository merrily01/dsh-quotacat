// client 侧入口壳（浏览器端模块）。
//
// 构建产物 dist/client.js 保持 DSH 浏览器侧的模块加载器格式：
//   window.__ModuleLoader__.load({ id, factory: (require) => {...} })

import { provideReact, provideReactDOM, provideRequire } from './client/runtime'
import { apply, inject } from './client/main'

window.__ModuleLoader__.load({
  id: 'dsh-quotacat',
  factory: (require: (id: string) => any) => {
    provideReact(require('react'))
    provideReactDOM(require('react-dom'))
    provideRequire(require)
    return { apply, inject }
  },
})
