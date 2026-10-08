import { test as base, expect, type Page } from '@playwright/test'

/** Aguarda o MSW iniciar e expor os controles dos mocks. */
export async function waitForMocks(page: Page) {
  await page.waitForFunction(() => window.__kurioMocks !== undefined)
}

export const test = base.extend<{ app: Page }>({
  app: async ({ page }, use) => {
    await page.goto('/')
    await waitForMocks(page)
    await use(page)
  },
})

export { expect }
