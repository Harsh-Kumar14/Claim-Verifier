"use client"

import * as React from "react"
import useSWRMutation from "swr/mutation"
import { verifyClaim, type VerificationResult } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"

type HistoryItem = { claim: string; result: VerificationResult }

function VerdictBadge({ verdict }: { verdict: VerificationResult["verdict"] }) {
  const map: Record<VerificationResult["verdict"], { text: string; variant: "default" | "secondary" | "destructive" | "success" | "outline" }> =
    {
      true: { text: "True", variant: "success" },
      false: { text: "False", variant: "destructive" },
      "partially-true": { text: "Partially True", variant: "outline" },
      unknown: { text: "Unknown", variant: "secondary" },
    }
  const v = map[verdict]
  return <Badge variant={v.variant}>{v.text}</Badge>
}

export function ClaimVerifier() {
  const [claim, setClaim] = React.useState("")
  const [history, setHistory] = React.useState<HistoryItem[]>([])
  const [error, setError] = React.useState<string | null>(null)

  const { trigger, data, isMutating } = useSWRMutation(
    "verify-claim",
    async (_key, { arg }: { arg: { claim: string } }) => {
      return await verifyClaim({ claim: arg.claim })
    },
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const c = claim.trim()
    if (!c) {
      setError("Please enter a claim to verify.")
      return
    }
    try {
      const result = await trigger({ claim: c })
      if (result) {
        setHistory((prev) => [{ claim: c, result }, ...prev].slice(0, 5))
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong")
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <Card className="bg-background text-foreground">
        <CardHeader>
          <CardTitle className="text-pretty">Veritas Sentinel - Crisis Claim Verifier</CardTitle>
          <CardDescription>AI-powered fact-checking for crisis situations with real-time verification, public guidance, and authoritative sources.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={onSubmit} className="space-y-5" aria-describedby="form-error">
            <div className="space-y-2">
              <Label htmlFor="claim">Claim</Label>
              <Textarea
                id="claim"
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                placeholder="e.g. Emergency shelters are open at the convention center downtown, or The bridge on Main Street is closed due to flooding."
                className="min-h-32"
              />
              <p className="text-xs text-muted-foreground">Enter crisis-related claims for real-time fact-checking and public safety guidance.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isMutating}>
                {isMutating ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner />
                    {"Verifying..."}
                  </span>
                ) : (
                  "Verify claim"
                )}
              </Button>
              <span id="form-error" className="text-sm text-destructive" aria-live="polite">
                {error}
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      {data ? (
        <Card aria-live="polite" className="bg-background text-foreground">
          <CardHeader className="space-y-2">
            <CardTitle className="text-pretty">Result</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <VerdictBadge verdict={data.verdict} />
              <Badge variant="secondary">Confidence: {(data.confidence * 100).toFixed(0)}%</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Confidence</h3>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.max(0, Math.min(100, Math.round(data.confidence * 100)))}%` }}
                  aria-label="Confidence percentage"
                />
              </div>
            </section>

            <section className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Summary</h3>
              <p className="text-sm leading-relaxed">{data.summary}</p>
            </section>

            {data.public_guidance && (
              <section className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Public Guidance</h3>
                <p className="text-sm leading-relaxed text-blue-700 dark:text-blue-300">{data.public_guidance}</p>
              </section>
            )}

            {data.crisis_relevance && (
              <section className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Crisis Relevance</h3>
                <Badge variant={data.crisis_relevance === "High" ? "destructive" : data.crisis_relevance === "Medium" ? "default" : "secondary"}>
                  {data.crisis_relevance}
                </Badge>
              </section>
            )}

            {Array.isArray(data.sources) && data.sources.length > 0 ? (
              <section className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Sources</h3>
                <ul className="list-disc pl-6">
                  {data.sources.map((s, i) => (
                    <li key={i}>
                      <a href={s.url} target="_blank" rel="noreferrer" className="text-sm underline underline-offset-4">
                        {s.title || s.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {data.last_verified && (
              <section className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Last Verified</h3>
                <p className="text-xs text-muted-foreground">{new Date(data.last_verified).toLocaleString()}</p>
              </section>
            )}
          </CardContent>
        </Card>
      ) : null}

      {history.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-pretty">Recent checks</CardTitle>
            <CardDescription>Last 5 verifications this session.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {history.map((h, idx) => (
                <li key={idx} className="flex items-start justify-between gap-4">
                  <p className="text-sm leading-relaxed">{h.claim}</p>
                  <VerdictBadge verdict={h.result.verdict} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
