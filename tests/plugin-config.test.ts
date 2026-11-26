import assert from 'node:assert/strict'
import test from 'node:test'

import { Config } from '../src/config.ts'

test('exports a configuration schema so DSH Settings can persist the plugin entry', () => {
  assert.ok(Config, 'plugin must export Config')
  assert.equal((Config as any)['~standard']?.vendor, 'schemastery')
})

test('marks user-editable settings volatile and exposes live config references', async () => {
  for (const key of ['refreshMinutes', 'notificationEnabled', 'notificationThreshold']) {
    assert.equal((Config as any).dict[key].meta.volatile, true, `${key} must be volatile`)
  }

  const result = await (Config as any)['~standard'].validate({})
  assert.equal('value' in result, true)
  assert.equal(result.value.refreshMinutes.get(), 10)
  assert.equal(result.value.notificationEnabled.get(), true)
  assert.equal(result.value.notificationThreshold.get(), 0.8)
})
