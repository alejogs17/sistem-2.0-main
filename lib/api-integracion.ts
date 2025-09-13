// Server-only helper for IntegrationAPI_V2
import 'server-only'

const getBaseUrl = () => {
  const url = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL
  if (!url) {
    throw new Error('API_BASE_URL/NEXT_PUBLIC_API_BASE_URL is not set')
  }
  return url.replace(/\/$/, '')
}

export async function apiLogin(params?: { username?: string; password?: string }) {
  const username = params?.username ?? process.env.API_USERNAME
  const password = params?.password ?? process.env.API_PASSWORD

  if (!username || !password) {
    throw new Error('API credentials (API_USERNAME/API_PASSWORD) are not configured')
  }

  const loginUrl = `${getBaseUrl()}/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`

  const res = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // Some APIs expect empty body on POST login with query params
    body: undefined,
    // Ensure server runtime fetch; Next can cache by default
    cache: 'no-store',
  })

  if (!res.ok) {
    let details: any = undefined
    try {
      details = await res.json()
    } catch {}
    const message = details?.error || details?.message || `Login request failed with status ${res.status}`
    const error: any = new Error(message)
    error.status = res.status
    error.details = details
    throw error
  }

  const data = await res.json()
  return data
}

export async function insertInvoice(params: { invoiceData: any; token: string }) {
  const { invoiceData, token } = params
  if (!invoiceData) throw new Error('invoiceData is required')
  if (!token) throw new Error('token is required')

  const url = `${getBaseUrl()}/insertinvoice`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `misfacturas ${token}`,
    },
    body: JSON.stringify(invoiceData),
    cache: 'no-store',
  })

  if (!res.ok) {
    let details: any = undefined
    try {
      details = await res.json()
    } catch {}
    const message = details?.error || details?.message || `Insert invoice failed with status ${res.status}`
    const error: any = new Error(message)
    error.status = res.status
    error.details = details
    throw error
  }

  return res.json()
}

export async function getDocumentStatus(params: { documentId: string | number; token: string; documentType?: string }) {
  const { documentId, token, documentType = '01' } = params
  if (!documentId) throw new Error('documentId is required')
  if (!token) throw new Error('token is required')

  const url = `${getBaseUrl()}/GetDocumentStatus`

  const payload = {
    DocumentId: typeof documentId === 'number' ? documentId : String(documentId),
    DocumentType: documentType,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `misfacturas ${token}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  if (!res.ok) {
    let details: any = undefined
    try {
      details = await res.json()
    } catch {}
    const message = details?.error || details?.message || `Get document status failed with status ${res.status}`
    const error: any = new Error(message)
    error.status = res.status
    error.details = details
    throw error
  }

  return res.json()
}
