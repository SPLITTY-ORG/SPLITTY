// Account-scoped storage utility
// Keys are scoped by wallet address so each account has separate data

export function getStorageKey(key: string, walletAddress?: string): string {
  if (walletAddress) {
    return `splitty_${walletAddress.toLowerCase()}_${key}`
  }
  return `splitty_global_${key}`
}

export function getAccountData(key: string, walletAddress: string): any {
  const storageKey = getStorageKey(key, walletAddress)
  const data = localStorage.getItem(storageKey)
  return data ? JSON.parse(data) : null
}

export function setAccountData(key: string, walletAddress: string, data: any): void {
  const storageKey = getStorageKey(key, walletAddress)
  localStorage.setItem(storageKey, JSON.stringify(data))
}

export function removeAccountData(key: string, walletAddress: string): void {
  const storageKey = getStorageKey(key, walletAddress)
  localStorage.removeItem(storageKey)
}

// Sound preference is global (not account-specific)
export function getSoundPreference(): boolean {
  const saved = localStorage.getItem('splitty_sound_enabled')
  return saved ? JSON.parse(saved) : true
}

export function setSoundPreference(enabled: boolean): void {
  localStorage.setItem('splitty_sound_enabled', JSON.stringify(enabled))
}
