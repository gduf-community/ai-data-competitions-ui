"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
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

const forgotPasswordFormSchema = z.object({
  email: z.string().trim().toLowerCase().email("请输入有效邮箱"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

export function ForgotPasswordForm1({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "发送失败，请稍后重试。");
      }

      toast.success(
        payload.message ?? "如果该邮箱已注册，我们已发送重置验证码，请注意查收。",
      );
      router.push(`/reset-password?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "发送失败，请稍后重试。";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">找回密码</CardTitle>
          <CardDescription>
            输入注册邮箱，我们会发送重置验证码（同一邮箱每日最多 5 次）。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6">
                <div className="grid gap-6">
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
                  <Button
                    type="submit"
                    className="w-full cursor-pointer"
                    disabled={submitting}
                  >
                    {submitting ? "发送中..." : "发送重置验证码"}
                  </Button>
                </div>
                <div className="text-center text-sm">
                  想起密码了？{" "}
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
