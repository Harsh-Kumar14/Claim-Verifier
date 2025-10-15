export type VerifyPayload = {
  claim: string
}

export type BackendVerificationResult = {
  claim: string
  status: "Verified" | "False" | "Partially True" | "Unconfirmed" | "Outdated"
  confidence: "High" | "Medium" | "Low"
  summary: string
  public_guidance: string
  sources: string[]
  last_verified: string
  crisis_relevance: "High" | "Medium" | "Low"
}

export type VerificationResult = {
  verdict: "true" | "false" | "partially-true" | "unknown"
  confidence: number // 0..1
  summary: string
  sources: Array<{ title?: string; url: string }>
  public_guidance?: string
  crisis_relevance?: string
  last_verified?: string
}

// Helper function to convert backend response to frontend format
function convertBackendResponse(backendResult: BackendVerificationResult): VerificationResult {
  // Convert status to verdict
  let verdict: VerificationResult["verdict"]
  switch (backendResult.status) {
    case "Verified":
      verdict = "true"
      break
    case "False":
      verdict = "false"
      break
    case "Partially True":
      verdict = "partially-true"
      break
    case "Unconfirmed":
    case "Outdated":
    default:
      verdict = "unknown"
      break
  }

  // Convert confidence to number
  let confidence: number
  switch (backendResult.confidence) {
    case "High":
      confidence = 0.9
      break
    case "Medium":
      confidence = 0.6
      break
    case "Low":
    default:
      confidence = 0.3
      break
  }

  // Convert sources to required format
  const sources = backendResult.sources.map(url => ({
    title: extractTitleFromUrl(url),
    url: url
  }))

  return {
    verdict,
    confidence,
    summary: backendResult.summary,
    sources,
    public_guidance: backendResult.public_guidance,
    crisis_relevance: backendResult.crisis_relevance,
    last_verified: backendResult.last_verified
  }
}

// Helper function to extract title from URL
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace('www.', '')
    return hostname.charAt(0).toUpperCase() + hostname.slice(1)
  } catch {
    return url
  }
}

// Helper function to clean JSON from markdown code blocks
function cleanJsonString(jsonString: string): string {
  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  let cleaned = jsonString.trim()
  
  // Remove leading ```json or ```
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '')
  
  // Remove trailing ```
  cleaned = cleaned.replace(/\n?```\s*$/, '')
  
  return cleaned.trim()
}

export async function verifyClaim(payload: VerifyPayload): Promise<VerificationResult> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
  
  try {
    const response = await fetch(`${apiBaseUrl}/verify-claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    // The backend returns { verification: "stringified JSON" }
    let backendResult: BackendVerificationResult
    
    if (typeof data.verification === 'string') {
      // Clean the string from markdown code blocks before parsing
      const cleanedJson = cleanJsonString(data.verification)
      
      try {
        backendResult = JSON.parse(cleanedJson)
      } catch (parseError) {
        console.error('Failed to parse JSON:', cleanedJson)
        throw new Error('AI returned invalid JSON format')
      }
    } else if (data.verification && typeof data.verification === 'object') {
      backendResult = data.verification
    } else {
      throw new Error('Invalid response format from backend')
    }

    return convertBackendResponse(backendResult)
    
  } catch (error) {
    console.error('Error verifying claim:', error)
    throw new Error(`Failed to verify claim: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
