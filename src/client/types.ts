// client 侧最小类型声明（按本插件实际用到的最小面）。

export interface DictionaryEntry {
  [key: string]: string
}

export interface LocaleService {
  register(namespace: string, dicts: { zh: DictionaryEntry; en: DictionaryEntry }): void
  bind(namespace: string): (key: string, ...args: unknown[]) => string
  subscribe(cb: () => void): () => void
}

export interface SlotDescriptor {
  name: string
  id: string
  order?: number
  label?: () => string
  locale?: string
}

export interface SlotRegistry {
  register(descriptor: SlotDescriptor, render: () => unknown): () => void
  inject(name: string, factory: () => unknown): void
}

export interface ClientContext {
  effect(fn: () => void | (() => void), label?: string): void
  locale: LocaleService
  slots: SlotRegistry
}

interface DSHModuleSpec {
  id: string
  factory: (require: (id: string) => any) => unknown
}

declare global {
  interface Window {
    __ModuleLoader__: {
      load(spec: DSHModuleSpec): void
    }
  }
}

export type {}
