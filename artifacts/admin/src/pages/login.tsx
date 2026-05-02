import { useAdminLogin } from "@workspace/api-client-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useAdminLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    login.mutate(
      { data: { password } },
      {
        onSuccess: (res) => {
          if (res.ok && res.token) {
            localStorage.setItem("admin_token", res.token);
            setLocation("/dashboard");
          } else {
            toast({
              title: "Authentication Failed",
              description: "Invalid credentials.",
              variant: "destructive",
            });
          }
        },
        onError: () => {
          toast({
            title: "Authentication Failed",
            description: "Invalid credentials or server error.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-mono uppercase tracking-tighter">CelpePrep Ops</CardTitle>
          <CardDescription>Enter administrative credentials to proceed.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Passphrase</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono"
                autoComplete="current-password"
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={login.isPending}
              data-testid="button-login"
            >
              {login.isPending ? "Authenticating..." : "Authorize Access"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
