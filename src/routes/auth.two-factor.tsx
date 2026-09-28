import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/two-factor")({ component: TwoFAPage });

function TwoFAPage() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    // Simulate verification
    setTimeout(() => {
      setLoading(false);
      // Accept any code for simulation, but prompt for '123456' as standard
      toast.success("MFA authentication successful!");
      nav({ to: "/app" });
    }, 800);
  };

  return (
    <AuthShell
      title="Two-factor authentication"
      subtitle="Open your authenticator app and enter the current code."
      footer={<Link to="/auth/login" className="font-medium text-primary hover:underline">Use another method</Link>}
    >
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm">
        <ShieldCheck className="h-5 w-5 text-primary" />
        Your account uses 2FA. This extra step keeps your data safe.
      </div>
      <form onSubmit={handleVerify} className="space-y-6">
        {error && <div className="text-sm text-red-500 text-center font-medium">{error}</div>}
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode} disabled={loading}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button type="submit" className="w-full rounded-full bg-gradient-primary" disabled={loading}>
          {loading ? "Verifying..." : "Verify & continue"}
        </Button>
      </form>
    </AuthShell>
  );
}