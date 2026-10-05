"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "@/lib/i18n/toast";
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

const teacherSignupSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("请输入有效邮箱地址"),
    password: z
      .string()
      .min(8, "密码至少需要 8 位")
      .regex(/[A-Za-z]/, "密码需包含字母")
      .regex(/\d/, "密码需包含数字"),
    confirmPassword: z.string().min(8, "请再次输入密码"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

type TeacherSignupFormValues = z.infer<typeof teacherSignupSchema>;

export function TeacherSignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<TeacherSignupFormValues>({
    resolver: zodResolver(teacherSignupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: TeacherSignupFormValues) {
    setSubmitting(true);
    try {
      const registerResponse = await fetch("/api/auth/register/teacher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const registerPayload = (await registerResponse.json()) as {
        message?: string;
      };

      if (!registerResponse.ok) {
        throw new Error(registerPayload.message ?? "注册失败");
      }

      const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));
      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl,
      });

      if (!signInResult || signInResult.error) {
        toast.success("注册成功，请登录");
        router.push("/sign-in");
        return;
      }

      toast.success("注册成功，已自动登录");
      const target = signInResult.url
        ? sanitizeCallbackUrl(signInResult.url)
        : callbackUrl;
      router.push(target);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "注册失败";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">教师注册</CardTitle>
          <CardDescription>使用邮箱注册教师账号以查看竞赛管理平台</CardDescription>
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
                        <FormLabel>邮箱</FormLabel>
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
                        <FormLabel>密码</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
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

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>确认密码</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              autoComplete="new-password"
                              className="pr-9"
                              {...field}
                            />
                            <button
                              type="button"
                              tabIndex={-1}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                              onMouseDown={(e) => { e.preventDefault(); setShowConfirmPassword((v) => !v); }}
                            >
                              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
                    {submitting ? "注册中..." : "教师注册"}
                  </Button>
                </div>

                <div className="text-center text-sm">
                  已有账号？{" "}
                  <a href="/sign-in" className="underline underline-offset-4">
                    立即登录
                  </a>
                </div>

                <div className="text-center text-sm">
                  <a href="/sign-up" className="text-muted-foreground underline underline-offset-4">
                    学生注册通道
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
