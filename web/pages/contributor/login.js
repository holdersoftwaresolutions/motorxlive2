import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ContributorLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/login");
  }, [router]);

  return (
    <div style={{ padding: 32, fontFamily: "system-ui" }}>
      Redirecting to login...
    </div>
  );
}