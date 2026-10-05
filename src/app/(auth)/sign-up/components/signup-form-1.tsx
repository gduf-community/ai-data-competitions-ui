"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

const signupFormSchema = z
  .object({
    name: z.string().trim().min(2, "请输入姓名"),
    college: z.string().trim().min(2, "请输入学院"),
    className: z.string().trim().min(2, "请输入班级"),
    grade: z.string().trim().min(1, "请输入年级"),
    studentId: z.string().regex(/^[A-Za-z0-9]{6,12}$/, "学号格式不正确（6-12位字母或数字）"),
    email: z.string().trim().toLowerCase().email("请输入有效邮箱"),
    verificationCode: z.string().trim().regex(/^\d{6}$/, "请输入 6 位邮箱验证码"),
    password: z
      .string()
      .min(8, "密码至少需要 8 位")
      .regex(/[A-Za-z]/, "密码需包含字母")
      .regex(/\d/, "密码需包含数字"),
    confirmPassword: z.string().min(8, "请再次输入密码"),
    terms: z.boolean().refine((value) => value, "请同意平台使用条款"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupFormSchema>;

export function SignupForm1({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { tt } = useI18nText();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeCooldownSeconds, setCodeCooldownSeconds] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      name: "",
      college: "",
      className: "",
      grade: "",
      studentId: "",
      email: "",
      verificationCode: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  useEffect(() => {
    if (codeCooldownSeconds <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCodeCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [codeCooldownSeconds]);

  async function sendVerificationCode() {
    const valid = await form.trigger("email");
    if (!valid) {
      return;
    }

    setSendingCode(true);
    try {
      const email = form.getValues("email");
      const response = await fetch("/api/auth/register/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("Retry-After") ?? "60");
          if (Number.isFinite(retryAfter) && retryAfter > 0) {
            setCodeCooldownSeconds(Math.max(1, Math.ceil(retryAfter)));
          }
        }
        throw new Error(payload.message ?? "发送验证码失败");
      }

      toast.success(payload.message ?? "验证码已发送");
      setCodeCooldownSeconds(60);
    } catch (error) {
      const message = error instanceof Error ? error.message : "发送验证码失败";
      toast.error(message);
    } finally {
      setSendingCode(false);
    }
  }

  async function onSubmit(data: SignupFormValues) {
    setSubmitting(true);
    try {
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          college: data.college,
          className: data.className,
          grade: data.grade,
          studentId: data.studentId,
          email: data.email,
          verificationCode: data.verificationCode,
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
          <CardTitle className="text-xl">{tt("注册账号")}</CardTitle>
          <CardDescription>{tt("注册学生账号以提交和跟踪竞赛申报")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{tt("姓名")}</FormLabel>
                          <FormControl>
                            <Input placeholder={tt("请输入姓名")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="studentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{tt("学号")}</FormLabel>
                          <FormControl>
                            <Input placeholder={tt("请输入学号")} maxLength={12} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="college"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{tt("学院")}</FormLabel>
                          <FormControl>
                            <Input placeholder={tt("请输入学院")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="className"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{tt("班级")}</FormLabel>
                          <FormControl>
                            <Input placeholder={tt("请输入班级")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{tt("年级")}</FormLabel>
                          <FormControl>
                            <Input placeholder={tt("如：2024级")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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

                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <FormField
                      control={form.control}
                      name="verificationCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{tt("邮箱验证码")}</FormLabel>
                          <FormControl>
                            <Input
                              inputMode="numeric"
                              placeholder={tt("请输入 6 位验证码")}
                              maxLength={6}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="md:self-end"
                      onClick={() => void sendVerificationCode()}
                      disabled={sendingCode || codeCooldownSeconds > 0}
                    >
                      {sendingCode ? tt("发送中...") : tt("发送验证码")}
                    </Button>
                    {codeCooldownSeconds > 0 ? (
                      <p className="md:col-span-2 text-xs text-muted-foreground">
                        当前邮箱需等待 {codeCooldownSeconds} 秒后才能重新发送验证码。
                      </p>
                    ) : null}
                  </div>

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tt("密码")}</FormLabel>
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
                        <FormLabel>{tt("确认密码")}</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="terms"
                    render={({ field }) => (
                      <FormItem className="flex items-start space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-0.5"
                          />
                        </FormControl>
                        <FormLabel className="text-sm">
                          {tt("我确认提交的信息真实有效，并同意平台使用条款")}
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full cursor-pointer"
                    disabled={submitting}
                  >
                    {submitting ? tt("注册中...") : tt("注册")}
                  </Button>
                </div>

                <div className="text-center text-sm">
                  {tt("已有账号？")}{" "}
                  <a href="/sign-in" className="underline underline-offset-4">
                    {tt("立即登录")}
                  </a>
                </div>

                <div className="text-center text-sm">
                  <a
                    href="/sign-up/teacher"
                    className="text-muted-foreground underline underline-offset-4"
                  >
                    {tt("教师注册通道")}
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
