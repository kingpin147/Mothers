import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  // We only allow super_admin. 
  // If unauthorized, we return a 404 instead of a redirect to completely hide the route.
  if (!session || role !== "super_admin") {
    notFound();
  }

  return (
    <div style={{ backgroundColor: "#0a0a0a", minHeight: "100vh", color: "#ededed", fontFamily: "sans-serif" }}>
      <header style={{ 
        borderBottom: "1px solid #333", 
        padding: "16px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ fontSize: "18px", fontWeight: "bold" }}>System Monitor</div>
        <div style={{ fontSize: "14px", color: "#888" }}>Super Admin Portal</div>
      </header>
      <main style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
