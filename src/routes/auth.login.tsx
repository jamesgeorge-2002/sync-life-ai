import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell, GoogleButton } from "@/components/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export const Route = createFileRoute("/auth/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      nav({ to: "/app" });
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
      nav({ to: "/app" });
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
        setError("The Google login window was closed before completion. Please try again.");
      } else if (err.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized for Google Sign-In. Please add localhost (or your current domain) to the authorized domains in your Firebase console under Authentication > Settings.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Google Sign-In is not enabled. Please enable the Google provider in your Firebase console under Authentication > Sign-in method.");
      } else {
        setError(err.message || "Failed to log in with Google");
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue managing your life with AI."
      footer={<>Don't have an account? <Link to="/auth/register" className="font-medium text-primary hover:underline">Create one</Link></>}
    >
      <form className="space-y-4" onSubmit={handleLogin}>
        {error && <div className="text-sm text-red-500 font-medium">{error}</div>}
        <div onClick={handleGoogleLogin}>
          <GoogleButton />
        </div>
        <div className="relative py-2"><div className="absolute inset-x-0 top-1/2 h-px bg-border" /><span className="relative mx-auto block w-max bg-background px-2 text-xs text-muted-foreground">or</span></div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required placeholder="you@work.com" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="pw">Password</Label>
            <Link to="/auth/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
          </div>
          <Input id="pw" type="password" required placeholder="••••••••" className="mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox /> Keep me signed in</label>
        <Button type="submit" className="w-full rounded-full bg-gradient-primary" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}