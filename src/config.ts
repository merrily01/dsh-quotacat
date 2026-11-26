import z from '@deepseek-ai/schemastery'

export const Config = z.object({
  apiKey: z.string().default('').hidden(),
  refreshMinutes: z.natural().max(1440).default(10).volatile(),
  baseURL: z.string().default('https://open.bigmodel.cn').hidden(),
  notificationEnabled: z.boolean().default(true).volatile(),
  notificationThreshold: z.number().min(0.5).max(0.95).step(0.05).default(0.8).volatile(),
})
