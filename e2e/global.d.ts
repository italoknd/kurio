import type { MockControls } from '@/mocks/browser'

declare global {
  interface Window {
    __kurioMocks?: MockControls
  }
}
