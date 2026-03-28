"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-posta adresi gereklidir")
    .email("Gecerli bir e-posta adresi giriniz"),
  password: z
    .string()
    .min(1, "Sifre gereklidir")
    .min(6, "Sifre en az 6 karakter olmalidir"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post("/api/auth/login", {
        email: data.email,
        password: data.password,
      });

      const { user, access_token, refresh_token } = response.data;
      login(user, access_token, refresh_token);
      router.push("/");
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Giris yapilamadi. Lutfen bilgilerinizi kontrol ediniz."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-50 via-background to-navy-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Building2 className="h-9 w-9 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Emlak <span className="text-primary">CRM</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Turkiye Emlak Yonetim Sistemi
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <h2 className="text-xl font-semibold text-center">
              Giris Yap
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              Hesabiniza giris yapmak icin bilgilerinizi giriniz
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium leading-none"
                >
                  E-posta Adresi
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@emlak.com"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium leading-none"
                >
                  Sifre
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sifrenizi giriniz"
                    autoComplete="current-password"
                    {...register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Giris yapiliyor...
                  </span>
                ) : (
                  "Giris Yap"
                )}
              </Button>

              {/* Forgot Password */}
              <div className="text-center">
                <Button variant="link" className="text-sm" type="button">
                  Sifremi Unuttum
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; 2026 Emlak CRM. Tum haklari saklidir.
        </p>
      </div>
    </div>
  );
}
