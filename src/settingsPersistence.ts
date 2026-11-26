interface SettingsService {
  update(entryId: string, patch: Record<string, unknown>): Promise<unknown>
}

interface SettingsContext {
  get(name: string): unknown
  fiber?: { entry?: { options?: { id?: unknown } } }
}

export async function persistPluginSettings(
  context: unknown,
  patch: Record<string, unknown>,
): Promise<void> {
  const ctx = context as SettingsContext
  const service = ctx.get('settings') as SettingsService | undefined
  const entryId = ctx.fiber?.entry?.options?.id
  if (service === undefined || typeof service.update !== 'function' || typeof entryId !== 'string' || entryId.length === 0) {
    throw new Error('settings service or profile entry unavailable')
  }
  await service.update(entryId, patch)
}

export function canPersistPluginSettings(context: unknown): boolean {
  const ctx = context as SettingsContext
  const service = ctx.get('settings') as SettingsService | undefined
  const entryId = ctx.fiber?.entry?.options?.id
  return service !== undefined && typeof service.update === 'function' && typeof entryId === 'string' && entryId.length > 0
}
