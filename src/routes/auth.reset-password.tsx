import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

interface ResetPasswordSearch {
  oobCode?: string;
}

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPage,
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => {
    return {
      oobCode: search.oobCode as string | undefined,
    };
  },
});

function ResetPage() {
  const { oobCode } = Route.useSearch();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(!!oobCode);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (oobCode) {
      setVerifying(true);
      verifyPasswordResetCode(auth, oobCode)
        .then((emailAddress) => {
          setEmail(emailAddress);
          setVerifying(false);
        })
        .catch((err: any) => {
          setError(err.message || "Invalid or expired password reset link. Please request a new link.");
          setVerifying(false);
        });
    }
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    if (!oobCode) {
      setError("Missing reset code. Please use the link sent to your email.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
      toast.success("Password has been reset successfully! Redirecting to login...");
      setTimeout(() => {
        nav({ to: "/auth/login" });
      }, 3000);
    } catch (err: any) {
      const errMsg = err.message || "Failed to reset password. The link may have expired.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!oobCode) {
    return (
      <AuthShell
        title="Invalid Link"
        subtitle="No password reset code found."
        footer={<Link to="/auth/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}
      >
        <div className="space-y-4 text-center">
          <div className="rounded-2xl bg-amber-500/10 p-4 text-sm text-amber-500 border border-amber-500/20">
            It looks like you opened this page directly. Please use the password reset link sent to your email, or request a new reset link.
          </div>
          <Link to="/auth/forgot-password">
            <Button className="w-full rounded-full bg-gradient-primary mt-4">
              Request reset link
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (verifying) {
    return (
      <AuthShell title="Verifying reset link" subtitle="Please wait while we check your request...">
        <div className="flex justify-center p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={email ? `Resetting password for ${email}` : "Make it strong — you know the drill."}
      footer={<Link to="/auth/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}
    >
      {success ? (
        <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-500 border border-emerald-500/20 text-center">
          Your password has been successfully reset. Redirecting you to login...
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && <div className="text-sm text-red-500 font-medium">{error}</div>}
          <div>
            <Label htmlFor="new-pw">New password</Label>
            <Input
              id="new-pw"
              required
              type="password"
              className="mt-1"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="confirm-pw">Confirm password</Label>
            <Input
              id="confirm-pw"
              required
              type="password"
              className="mt-1"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full rounded-full bg-gradient-primary" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}