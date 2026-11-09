export function registerQuota(
  ctx: {
    slots: {
      inject(name: string, factory: () => unknown): void
      register(
        descriptor: { name: string; id: string; order: number; label: () => string; locale: string },
        render: () => unknown,
      ): unknown
    }
  },
  t: (key: string) => string,
  React: Pick<typeof import('react'), 'createElement'>,
  QuotaComponent: import('react').ComponentType<{ t: (key: string) => string }>,
): void {
  ctx.slots.inject('conversation.composer.dock', () =>
    ctx.slots.register(
      {
        name: 'conversation.composer.dock',
        id: 'dsh-quotacat',
        order: 100,
        label: () => t('footerLabel'),
        locale: 'dsh-quotacat',
      },
      () => React.createElement(QuotaComponent, { t }),
    ),
  )
}
