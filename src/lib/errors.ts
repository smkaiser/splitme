/**
 * Extract an error message from a failed Response.
 * Tries to parse JSON and pull an `error` field, falls back to statusText.
 */
export async function getErrorMessage(res: Response): Promise<string> {
  try {
    const j = await res.json()
    return j.error || JSON.stringify(j)
  } catch {
    return res.statusText
  }
}
