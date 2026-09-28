import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/verify-email")({ component: VerifyEmail });

function VerifyEmail() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [resendCooldown, setResendCooldown] = useState(60);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && !user.emailVerified) {
      sendEmailVerification(user)
        .then(() => {
          toast.success("Verification email sent!");
        })
        .catch((err: any) => {
          console.error("Error sending verification email:", err);
          // Don't show toast error automatically on mount to avoid annoying users if they reload too fast
        });
    }
  }, [user]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    if (!user) {
      toast.error("Please sign in first to verify your email.");
      nav({ to: "/auth/login" });
      return;
    }
    setLoading(true);
    try {
      await sendEmailVerification(user);
      toast.success("Verification email resent!");
      setResendCooldown(60);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Check your inbox"
      subtitle={user?.email ? `We sent a verification link to ${user.email}. Click it to activate your account.` : "We sent a verification link to your email. Click it to activate your account."}
      footer={<Link to="/auth/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}
    >
      <div className="glass rounded-2xl p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground">
          <Mail className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Didn't get it? Check spam, or{" "}
          {resendCooldown > 0 ? (
            <span>resend in <span className="font-medium text-foreground">{resendCooldown}s</span></span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="text-primary hover:underline font-medium"
            >
              resend email
            </button>
          )}
        </p>
        <Button className="mt-6 w-full rounded-full bg-gradient-primary" onClick={() => nav({ to: "/auth/verify-otp" })}>
          Enter code instead
        </Button>
      </div>
    </AuthShell>
  );
}