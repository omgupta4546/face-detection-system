import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("student");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login, register, googleLogin } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    try {
      let actualRole = role; // Default for signup
      if (isSignUp) {
        await register({ name, email, password, role });
      } else {
        const userData = await login(email, password);
        actualRole = userData?.role || role;
      }

      const paths: Record<string, string> = {
        student: "/student",
        professor: "/professor",
        admin: "/admin",
        college_admin: "/admin",
        "super_admin": "/super-admin",
        "super-admin": "/super-admin",
      };
      navigate(paths[actualRole] || "/student");
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.response?.data?.msg || "An error occurred during authentication.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-1/2 items-center justify-center gradient-hero lg:flex relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 left-20 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-20 right-20 h-48 w-48 rounded-full bg-white/5 blur-2xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-md space-y-8 px-12 text-center relative z-10"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20">
            <GraduationCap className="h-10 w-10 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-4xl font-bold text-primary-foreground">SmartClass</h2>
            <p className="mt-3 text-lg text-primary-foreground/75 leading-relaxed">
              AI-powered attendance, analytics, and classroom management for modern institutions.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-sm text-primary-foreground/60">
            <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
              <Sparkles className="h-4 w-4" />
              <span>Face Recognition Attendance</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
              <Sparkles className="h-4 w-4" />
              <span>Real-time Analytics Dashboard</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
              <Sparkles className="h-4 w-4" />
              <span>Multi-Institution Management</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="space-y-2 lg:hidden text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl gradient-primary shadow-sm">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignUp ? "Sign up to get started with SmartClass" : "Sign in to your SmartClass account"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto", overflow: "visible" }}
                  exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 pb-2">
                    <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                    <Input id="name" name="name" placeholder="John Doe" className="h-11 rounded-xl" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@university.edu" className="h-11 rounded-xl" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-11 pr-10 rounded-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sign in as</Label>
              <Select value={role} onValueChange={setRole} name="role">
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="professor">Professor</SelectItem>
                  <SelectItem value="admin">College Admin</SelectItem>
                  <SelectItem value="super-admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button disabled={isLoading} type="submit" className="w-full h-11 gradient-primary border-0 text-primary-foreground gap-2 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              {isLoading ? "Please wait..." : (isSignUp ? "Create Account" : "Sign In")} <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground">or continue with</span>
            </div>
          </div>

          <div className="flex justify-center w-full min-h-[44px]">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                if (!credentialResponse.credential) return;
                try {
                  setIsLoading(true);
                  // googleLogin now awaits checkAuth() internally, so user
                  // state is fully committed before we navigate — no race condition.
                  await googleLogin(credentialResponse.credential);
                  const tokenData = localStorage.getItem("token");
                  if (tokenData) {
                    const payload = JSON.parse(atob(tokenData.split(".")[1]));
                    const userRole: string = payload?.user?.role || "student";
                    const paths: Record<string, string> = {
                      student: "/student",
                      professor: "/professor",
                      admin: "/admin",
                      super_admin: "/super-admin",
                      "super-admin": "/super-admin",
                    };
                    navigate(paths[userRole] || "/student");
                  } else {
                    navigate("/student");
                  }
                } catch (error: any) {
                  toast({
                    title: "Google Login Failed",
                    description: error.response?.data?.msg || "An error occurred with Google Sign-In.",
                    variant: "destructive",
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              onError={() => {
                toast({
                  title: "Google Login Error",
                  description: "Could not connect to Google Authentication.",
                  variant: "destructive",
                });
              }}
              theme="outline"
              size="large"
              shape="pill"
              text="continue_with"
              width="384"
            />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="font-semibold text-primary hover:underline">
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>

          <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to home
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
