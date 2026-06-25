"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth-client"
import { ShieldCheck } from "lucide-react"
import { H2, Muted } from "@/components/ui/typography"

export function TwoFactorForm() {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) return

    setLoading(true)
    try {
      const result = await authClient.twoFactor.verifyTotp(
        { code },
        {
          onRequest: () => setLoading(true),
          onResponse: () => setLoading(false),
        }
      )

      if (result?.error) {
        toast.error(result.error.message || "Invalid code. Please try again.")
        setCode("")
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      toast.error("Invalid code. Please try again.")
      setCode("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-6 text-center">
        <div className="flex justify-center mb-4">
          <ShieldCheck className="h-10 w-10 text-foreground" />
        </div>
        <H2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight border-none pb-0 mt-0 font-inter">
          Two-factor authentication
        </H2>
        <Muted className="text-sm mt-1.5 font-ibm">
          Enter the 6-digit code from your authenticator app.
        </Muted>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(val) => setCode(val)}
            autoFocus
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold"
          disabled={loading || code.length !== 6}
        >
          {loading ? <Spinner className="mr-2" /> : "Verify Code"}
        </Button>
      </form>
    </div>
  )
}
