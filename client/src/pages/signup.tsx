import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useTranslation } from "react-i18next"; 
import i18n from "@/lib/i18n";

export default function Signup() {
  const { t } = useTranslation(); 

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    displayName: "",
    bio: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signup(formData.username, formData.password, formData.displayName, formData.bio);

      toast({
        title: t('auth.signup.success_title'),
        description: t('auth.signup.success_desc'),
      });

      setLocation("/");
    } catch (error: any) {
      toast({
        title: t('auth.signup.failed_title'),
        description: error.message || t('auth.signup.failed_default'), 
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
          <CardTitle className="text-2xl font-bold">{t('auth.signup.title')}</CardTitle>
          <CardDescription>
            {t('auth.signup.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('auth.fields.username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder={t('auth.placeholders.username')}
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
                placeholder={t('auth.placeholders.password')}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                data-testid="input-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">{t('auth.fields.display_name')}</Label>
              <Input
                id="displayName"
                type="text"
                placeholder={t('auth.placeholders.display_name')}
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                required
                data-testid="input-displayname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">{t('auth.fields.bio_optional')}</Label>
              <Textarea
                id="bio"
                placeholder={t('auth.placeholders.bio')}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                data-testid="input-bio"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-signup"
            >
              {isLoading ? t('auth.signup.loading') : t('auth.signup.submit')}
            </Button>
            <div className="text-center text-sm">
              {t('auth.signup.have_account')}{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => setLocation("/login")}
                data-testid="link-login"
              >
                {t('auth.signup.login_link')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
