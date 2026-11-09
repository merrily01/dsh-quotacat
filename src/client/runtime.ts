// React 注入容器：DSH 浏览器侧的模块加载器约定 React 只能通过 factory(require)
// 在入口处获取，无法作为普通 ESM 导入。

type ReactModule = typeof import('react')
interface ReactDOMModule {
  createPortal(children: import('react').ReactNode, container: Element | DocumentFragment): import('react').ReactPortal
}

let injectedReact: ReactModule | null = null
let injectedReactDOM: ReactDOMModule | null = null
let injectedRequire: ((id: string) => any) | null = null

export function provideReact(react: ReactModule): void {
  injectedReact = react
}

export function provideReactDOM(reactDOM: ReactDOMModule): void {
  injectedReactDOM = reactDOM
}

export function provideRequire(requireFn: (id: string) => any): void {
  injectedRequire = requireFn
}

export function getReact(): ReactModule {
  if (injectedReact === null) {
    throw new Error('[dsh-quotacat] React 尚未注入')
  }
  return injectedReact
}

export function getReactDOM(): ReactDOMModule {
  if (injectedReactDOM === null) {
    throw new Error('[dsh-quotacat] React DOM 尚未注入')
  }
  return injectedReactDOM
}

/** 按需解析宿主模块（如 react-dom）；解析失败返回 undefined。 */
export function tryRequire(id: string): any {
  if (injectedRequire === null) return undefined
  try {
    return injectedRequire(id)
  } catch {
    return undefined
  }
}
