import assert from 'node:assert/strict'
import test from 'node:test'

import { registerQuota } from '../src/client/registerQuota.ts'

test('registers quota only in the composer dock', () => {
  const injected: string[] = []
  const registered: string[] = []
  registerQuota({
    slots: {
      inject: (name: string, factory: () => unknown) => {
        injected.push(name)
        factory()
      },
      register: (descriptor: { name: string }) => {
        registered.push(descriptor.name)
        return () => {}
      },
    },
  } as any, (key: string) => key, { createElement: () => null } as any, () => null)

  assert.deepEqual(injected, ['conversation.composer.dock'])
  assert.deepEqual(registered, ['conversation.composer.dock'])
})
