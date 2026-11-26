import assert from 'node:assert/strict'
import test from 'node:test'

import { persistPluginSettings } from '../src/settingsPersistence.ts'

test('persists plugin settings through the DSH settings service and entry id', async () => {
  const calls: unknown[][] = []
  const ctx = {
    get(name: string) {
      assert.equal(name, 'settings')
      return { update: async (...args: unknown[]) => { calls.push(args) } }
    },
    fiber: { entry: { options: { id: 'quotacat' } } },
  }

  await persistPluginSettings(ctx, {
    refreshMinutes: 30,
    notificationEnabled: false,
    notificationThreshold: 0.9,
  })

  assert.deepEqual(calls, [[
    'quotacat',
    { refreshMinutes: 30, notificationEnabled: false, notificationThreshold: 0.9 },
  ]])
})

test('rejects instead of reporting success when settings persistence is unavailable', async () => {
  await assert.rejects(
    persistPluginSettings({ get: () => undefined, fiber: {} }, { refreshMinutes: 5 }),
    /settings service or profile entry unavailable/,
  )
})
