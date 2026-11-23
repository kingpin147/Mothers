import { verifyAdminSession } from "@/lib/auth";

export async function verifyAdmin(
  allowedRoles: string[] = ["owner", "manager", "host", "super_admin"]
) {
  return await verifyAdminSession(allowedRoles);
}
