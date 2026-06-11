/* Client-side utility — wraps /api/userdata for per-user MongoDB persistence */

export async function getUserData(key: string): Promise<any> {
  try {
    const res = await fetch(`/api/userdata?key=${encodeURIComponent(key)}`)
    if (!res.ok) return null
    const json = await res.json()
    return json.value
  } catch { return null }
}

export async function saveUserData(key: string, value: any): Promise<void> {
  try {
    await fetch('/api/userdata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
  } catch {}
}

export async function loadAllUserData(): Promise<{
  holdings:        any[]
  cash:            number
  records:         any[]
  clients:         any[]
  startingCapital: number
}> {
  const [holdings, cash, records, clients, startingCapital] = await Promise.all([
    getUserData('holdings'),
    getUserData('cash'),
    getUserData('records'),
    getUserData('clients'),
    getUserData('starting-capital'),
  ])
  return {
    holdings:        holdings        ?? [],
    cash:            cash            ?? 0,
    records:         records         ?? [],
    clients:         clients         ?? [],
    startingCapital: startingCapital ?? 0,
  }
}
