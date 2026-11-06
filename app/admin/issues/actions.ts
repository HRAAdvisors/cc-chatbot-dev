"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getAdminToken } from "@/lib/admin-auth";
import { issuesDb, resourceIssueReports } from "@/lib/resource-issues-db";

export async function requireReportReviewer() {
  const secret = process.env.ADMIN_SECRET;
  if (
    !secret ||
    (await cookies()).get("admin_auth")?.value !== (await getAdminToken(secret))
  )
    redirect("/admin/login");
}

export async function updateReportStatus(form: FormData) {
  await requireReportReviewer();
  const id = form.get("id");
  const status = form.get("status");
  if (
    typeof id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(id) ||
    typeof status !== "string" ||
    !["new", "reviewing", "resolved"].includes(status)
  )
    throw new Error("Invalid report status");
  await issuesDb
    .update(resourceIssueReports)
    .set({ status })
    .where(eq(resourceIssueReports.id, id));
  revalidatePath("/admin/issues");
}
