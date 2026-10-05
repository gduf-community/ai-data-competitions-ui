import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground mt-2">未找到对应页面</p>
        <Button asChild className="mt-4">
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </div>
  )
}
