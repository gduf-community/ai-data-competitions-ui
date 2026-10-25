import { EulerBridgeLoader } from "@/components/shared/euler-bridge-loader";

export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <EulerBridgeLoader />
        <p className="text-sm text-muted-foreground">正在加载…</p>
      </div>
    </div>
  );
}
