import assert from 'node:assert/strict'
import test from 'node:test'

import { placePanel } from '../src/client/anchoredPosition.ts'

test('keeps the panel left-aligned with an ordinary trigger', () => {
  assert.deepEqual(
    placePanel({ left: 100, top: 700 }, 300, { width: 1000, height: 800 }),
    { left: 100, bottom: 108 },
  )
})

test('shifts the panel left when left alignment would cross the right margin', () => {
  assert.deepEqual(
    placePanel({ left: 900, top: 700 }, 300, { width: 1000, height: 800 }),
    { left: 688, bottom: 108 },
  )
})

test('pins a panel wider than the usable viewport to the left margin', () => {
  assert.deepEqual(
    placePanel({ left: 100, top: 700 }, 1200, { width: 1000, height: 800 }),
    { left: 12, bottom: 108 },
  )
})
