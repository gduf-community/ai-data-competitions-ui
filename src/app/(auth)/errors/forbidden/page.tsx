import { ForbiddenError } from "./components/forbidden-error";

interface ForbiddenPageProps {
  searchParams?: Promise<{
    mode?: string;
    ip?: string;
    province?: string;
    city?: string;
    path?: string;
  }>;
}

export default async function ForbiddenPage({ searchParams }: ForbiddenPageProps) {
  const params = searchParams ? await searchParams : undefined;

  return (
    <ForbiddenError
      policyBlocked={params?.mode === "regional-policy"}
      blockedIp={params?.ip}
      blockedProvince={params?.province}
      blockedCity={params?.city}
      blockedPath={params?.path}
    />
  );
}
