import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell, GoogleButton } from "@/components/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { createUserProfileDocument } from "@/lib/db";

export const Route = createFileRoute("/auth/register")({ component: RegisterPage });

function RegisterPage() {
  const nav = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const displayName = `${firstName} ${lastName}`.trim();
      await updateProfile(user, { displayName });
      
      await createUserProfileDocument(user.uid, {
        email: user.email,
        displayName,
        photoURL: user.photoURL,
      });

      nav({ to: "/app" });
    } catch (err: any) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
      // The onAuthStateChanged in useAuth will handle creating the user document
      nav({ to: "/app" });
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
        setError("The Google registration window was closed before completion. Please try again.");
      } else if (err.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized for Google Sign-In. Please add localhost (or your current domain) to the authorized domains in your Firebase console under Authentication > Settings.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Google Sign-In is not enabled. Please enable the Google provider in your Firebase console under Authentication > Sign-in method.");
      } else {
        setError(err.message || "Failed to register with Google");
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthShell
      title="Create your account"
      subtitle="14-day free trial. No credit card required."
      footer={<>Already have an account? <Link to="/auth/login" className="font-medium text-primary hover:underline">Sign in</Link></>}
    >
      <form className="space-y-4" onSubmit={handleRegister}>
        {error && <div className="text-sm text-red-500 font-medium">{error}</div>}
        <div onClick={handleGoogleRegister}>
          <GoogleButton label="Sign up with Google" />
        </div>
        <div className="relative py-2"><div className="absolute inset-x-0 top-1/2 h-px bg-border" /><span className="relative mx-auto block w-max bg-background px-2 text-xs text-muted-foreground">or</span></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>First name</Label><Input required className="mt-1" placeholder="James" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
          <div><Label>Last name</Label><Input required className="mt-1" placeholder="Carter" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
        </div>
        <div><Label>Email</Label><Input required type="email" className="mt-1" placeholder="you@work.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label>Password</Label><Input required type="password" className="mt-1" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button type="submit" className="w-full rounded-full bg-gradient-primary" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">By continuing you agree to our Terms & Privacy Policy.</p>
      </form>
    </AuthShell>
  );
}