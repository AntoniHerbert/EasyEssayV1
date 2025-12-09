import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useTranslation } from "react-i18next";

export default function Login() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation(); 
  const { toast } = useToast();
  const { user, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData.username, formData.password);

      toast({
        title: t('auth.login.success_title'), 
        description: t('auth.login.success_desc'), 
      });

      setLocation("/");
    } catch (error: any) {
      toast({
        title: t('auth.login.failed_title'), 
        description: error.message || t('auth.login.failed_default'), 
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('auth.login.title')}</CardTitle>
          <CardDescription>
            {t('auth.login.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('auth.fields.username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder={t('auth.placeholders.enter_username')}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.fields.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('auth.placeholders.enter_password')}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? t('auth.login.loading') : t('auth.login.submit')}
            </Button>
            <div className="text-center text-sm">
              {t('auth.login.no_account')}{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => setLocation("/signup")}
                data-testid="link-signup"
              >
                {t('auth.login.signup_link')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
