"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "@/lib/i18n/toast";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

const resetPasswordFormSchema = (usesLegacyLink: boolean) => z
  .object({
    email: z.string().trim().toLowerCase().email("请输入有效邮箱"),
    verificationCode: z.string().trim().refine(
      (code) => usesLegacyLink || /^\d{6}$/.test(code),
      "请输入 6 位邮箱验证码",
    ),
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

type ResetPasswordFormValues = z.infer<ReturnType<typeof resetPasswordFormSchema>>;

export function ResetPasswordForm1({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const initialEmail = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const legacyToken = searchParams.get("token")?.trim() ?? "";
  const usesLegacyLink = initialEmail.length > 0 && legacyToken.length > 0;

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema(usesLegacyLink)),
    defaultValues: {
      email: initialEmail,
      verificationCode: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          verificationCode: values.verificationCode,
          token: usesLegacyLink ? legacyToken : undefined,
          password: values.password,
          confirmPassword: values.confirmPassword,
        }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "重置密码失败，请稍后再试。");
      }

      toast.success(payload.message ?? "密码已重置，请重新登录。");
      router.push("/sign-in");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "重置密码失败，请稍后再试。";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">重置密码</CardTitle>
          <CardDescription>
            {usesLegacyLink
              ? "已从邮件重置链接进入，请直接设置新密码。"
              : "请输入邮箱验证码并设置新密码。"}
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
                        <FormLabel>邮箱</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            autoComplete="email"
                            placeholder="name@college.edu.cn"
                            disabled={usesLegacyLink}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {usesLegacyLink ? null : (
                    <FormField
                      control={form.control}
                      name="verificationCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>邮箱验证码</FormLabel>
                          <FormControl>
                            <Input
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="请输入 6 位验证码"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>新密码</FormLabel>
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
                        <FormLabel>确认新密码</FormLabel>
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
                    {submitting ? "提交中..." : "提交新密码"}
                  </Button>
                </div>

                <div className="text-center text-sm">
                  <a
                    href="/forgot-password"
                    className="text-muted-foreground underline underline-offset-4"
                  >
                    重新发送验证码
                  </a>
                </div>

                <div className="text-center text-sm">
                  <a href="/sign-in" className="underline underline-offset-4">
                    返回登录
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
