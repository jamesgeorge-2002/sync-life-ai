import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/forgot-password")({ component: ForgotPage });

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/reset-password`,
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      setSuccess(true);
      toast.success("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      const errMsg = err.message || "Failed to send password reset email";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle={success ? "Success!" : "Enter your email and we'll send a password reset link."}
      footer={<>Remembered it? <Link to="/auth/login" className="font-medium text-primary hover:underline">Sign in</Link></>}
    >
      {success ? (
        <div className="space-y-4 text-center">
          <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-500 border border-emerald-500/20">
            A secure link has been sent to <span className="font-semibold">{email}</span>. Click the link in the email to choose your new password.
          </div>
          <Link to="/auth/login">
            <Button className="w-full rounded-full bg-gradient-primary mt-4">
              Return to sign in
            </Button>
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleResetRequest}>
          {error && <div className="text-sm text-red-500 font-medium">{error}</div>}
          <div>
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              required
              type="email"
              className="mt-1"
              placeholder="you@work.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full rounded-full bg-gradient-primary" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}