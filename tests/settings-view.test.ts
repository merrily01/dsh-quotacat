import assert from 'node:assert/strict'
import test from 'node:test'

import * as footerModule from '../src/client/QuotaCatFooter.ts'
import { provideReact } from '../src/client/runtime.ts'

type TestNode = {
  type: unknown
  props: Record<string, unknown>
  children: unknown[]
}

const fakeReact = {
  createElement(type: unknown, props: Record<string, unknown> | null, ...children: unknown[]): TestNode {
    return { type, props: props ?? {}, children: children.flat(Infinity) }
  },
  useState<T>(initial: T): [T, (next: T) => void] {
    return [initial, () => {}]
  },
  useEffect(): void {},
}

function nodes(root: unknown): TestNode[] {
  const found: TestNode[] = []
  const visit = (value: unknown): void => {
    if (value === null || typeof value !== 'object') return
    const node = value as TestNode
    if ('type' in node && 'children' in node) {
      found.push(node)
      if (typeof node.type === 'function') {
        visit(node.type({ ...node.props, children: node.children }))
        return
      }
      node.children.forEach(visit)
    }
  }
  visit(root)
  return found
}

function visibleText(root: unknown): string {
  const parts: string[] = []
  const visit = (value: unknown): void => {
    if (typeof value === 'string' || typeof value === 'number') {
      parts.push(String(value))
      return
    }
    if (value === null || typeof value !== 'object') return
    const node = value as TestNode
    if (typeof node.type === 'function') {
      visit(node.type({ ...node.props, children: node.children }))
      return
    }
    node.children?.forEach(visit)
  }
  visit(root)
  return parts.join(' ')
}

test('renders only actionable settings in a compact form', () => {
  const SettingsForm = (footerModule as any).SettingsForm
  assert.equal(typeof SettingsForm, 'function', 'settings component must be testable')

  provideReact(fakeReact as any)
  const tree = SettingsForm({ onCancel: () => {}, onSaved: () => {} })
  const rendered = nodes(tree)
  const text = visibleText(tree)

  assert.equal(rendered.filter((node) => node.type === 'select').length, 1)
  assert.equal(rendered.filter((node) => node.props.role === 'switch').length, 1)
  assert.match(text, /自动刷新/)
  assert.match(text, /额度阈值提醒/)
  assert.match(text, /取消/)
  assert.match(text, /保存更改/)
  const actionButtons = rendered.filter((node) =>
    typeof node.props.className === 'string' && node.props.className.split(' ').includes('qc-s-action'),
  )
  assert.deepEqual(actionButtons.map((node) => visibleText(node)), ['取消', '保存更改'])
  assert.doesNotMatch(text, /数据来源|API Key|支持作者|爱发电/)
})

test('orders quota footer actions as refresh then settings icon', () => {
  const renderDialog = (footerModule as any).renderDialog
  assert.equal(typeof renderDialog, 'function', 'dialog renderer must be testable')

  provideReact(fakeReact as any)
  const tree = renderDialog(
    fakeReact,
    { loading: false },
    true,
    {},
    { current: null },
    { left: 0, bottom: 0 },
    'quota',
    () => {},
    () => {},
  )
  const rendered = nodes(tree)
  const footerButtons = rendered.filter((node) =>
    typeof node.props.className === 'string' && node.props.className.includes('qc-d-action'),
  )

  assert.equal(visibleText(footerButtons[0]), '刷新')
  assert.equal(footerButtons[1]?.props['aria-label'], '设置')
  assert.equal(footerButtons[1]?.props.title, '设置')
  assert.equal(nodes(footerButtons[1]).some((node) => node.type === 'svg'), true)
})

test('notifies once per threshold crossing and rearms after recovery', () => {
  const advance = (footerModule as any).advanceThresholdLatch
  assert.equal(typeof advance, 'function')

  assert.deepEqual(advance(false, true), { latched: true, notify: true })
  assert.deepEqual(advance(true, true), { latched: true, notify: false })
  assert.deepEqual(advance(true, false), { latched: false, notify: false })
  assert.deepEqual(advance(false, true), { latched: true, notify: true })
})
