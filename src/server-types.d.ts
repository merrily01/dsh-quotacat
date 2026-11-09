// 宿主侧共享类型与 cordis Context 的宿主服务声明。

import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * 本包用到的宿主能力（@deepseek-ai/dsh-host-webserver 增补的形状；
 * 按实际用到的最小面声明）。
 */
declare module '@deepseek-ai/cordis' {
  interface Context {
    webServer: {
      register(route: {
        kind: 'exact' | 'prefix'
        path: string
        handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
      }): () => void
    }
  }
}

export type {}
