export interface UpdateProfileRequest {
  displayName: string
  username: string
  email: string
  ensName: string | null
  walletNickname: string | null
}

export interface UpdateAvatarRequest {
  /** Imagem como data URL (PNG, JPEG ou WebP, até 1 MB). */
  dataUrl: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
