import { http } from '@/lib/http'
import type { User } from '@/types/auth'
import type { ChangePasswordRequest, UpdateProfileRequest } from '@/types/profile'

export const profileApi = {
  get: (signal?: AbortSignal) => http.get<User>('/profile', { signal }).then((r) => r.data),
  update: (body: UpdateProfileRequest) => http.patch<User>('/profile', body).then((r) => r.data),
  updateAvatar: (dataUrl: string) => http.put<User>('/profile/avatar', { dataUrl }).then((r) => r.data),
  removeAvatar: () => http.delete<User>('/profile/avatar').then((r) => r.data),
  changePassword: (body: ChangePasswordRequest) => http.post<void>('/profile/password', body).then(() => undefined),
}
