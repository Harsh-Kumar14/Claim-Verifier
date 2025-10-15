import { ClaimVerifier } from "@/components/claim-verifier"

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:py-12">
      <header className="mb-10 md:mb-12">
        <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl text-center">Veritas Sentinel</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base text-center mx-auto">
          Verify a statement and get a verdict, confidence, summary, and sources.
        </p>
      </header>

      <ClaimVerifier />
    </main>
  )
}
