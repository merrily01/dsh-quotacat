import assert from 'node:assert/strict'
import test from 'node:test'

import * as quotaRegistration from '../src/client/registerQuota.ts'

const { registerQuota } = quotaRegistration

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

test('registers the quota alert in the global shell overlay', () => {
  const registerQuotaToast = (quotaRegistration as any).registerQuotaToast
  assert.equal(typeof registerQuotaToast, 'function')
  const injected: string[] = []
  const registered: string[] = []

  registerQuotaToast({
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
  }, { createElement: () => null }, () => null)

  assert.deepEqual(injected, ['shell.overlay'])
  assert.deepEqual(registered, ['shell.overlay'])
})
