"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18nText } from "@/lib/i18n/client";
import { toast } from "@/lib/i18n/toast";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

function sanitizeCallbackUrl(raw: string | null): string {
  const fallback = "/";
  if (!raw) return fallback;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

const loginFormSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(8, "密码至少需要8个字符"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm1({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { tt } = useI18nText();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setSubmitting(true);
    try {
      const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));
      const result = await signIn("credentials", {
        ...data,
        redirect: false,
        callbackUrl,
      });

      if (!result || result.error) {
        toast.error("邮箱或密码错误");
        return;
      }

      toast.success("登录成功");
      const target = result.url ? sanitizeCallbackUrl(result.url) : callbackUrl;
      router.push(target);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "登录失败";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{tt("登录")}</CardTitle>
          <CardDescription>
            {tt("使用您的账号访问竞赛申报和管理平台")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6">
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tt("邮箱")}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="name@college.edu.cn"
                            autoComplete="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center">
                          <FormLabel>{tt("密码")}</FormLabel>
                          <a
                            href="/forgot-password"
                            className="ml-auto text-sm underline-offset-4 hover:underline"
                          >
                            {tt("忘记密码？")}
                          </a>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              autoComplete="current-password"
                              className="pr-9"
                              {...field}
                            />
                            <button
                              type="button"
                              tabIndex={-1}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                              onMouseDown={(e) => { e.preventDefault(); setShowPassword((v) => !v); }}
                            >
                              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full cursor-pointer"
                    disabled={submitting}
                  >
                    {submitting ? tt("登录中...") : tt("登录")}
                  </Button>
                </div>

                <div className="text-center text-sm">
                  {tt("还没有账号？")}{" "}
                  <a href="/sign-up" className="underline underline-offset-4">
                    {tt("立即注册")}
                  </a>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
