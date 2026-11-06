import Link from "next/link";
import { desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { issuesDb, resourceIssueReports } from "@/lib/resource-issues-db";
import { ISSUE_REASONS } from "@/lib/resource-finder";
import { requireReportReviewer, updateReportStatus } from "./actions";

export default async function IssueReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireReportReviewer();
  const query = await searchParams;
  const page = Math.max(
    0,
    Math.min(10000, Number.parseInt(query.page || "0", 10) || 0),
  );
  const reports = await issuesDb
    .select()
    .from(resourceIssueReports)
    .orderBy(
      desc(resourceIssueReports.createdAt),
      desc(resourceIssueReports.id),
    )
    .limit(51)
    .offset(page * 50);
  return (
    <main className="mx-auto flex max-w-4xl flex-col px-5 py-10 font-sans text-foreground">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <Link
            href="/admin"
            className="text-sm text-primary underline underline-offset-4"
          >
            Back to analytics
          </Link>
          <h1 className="text-3xl font-semibold">Resource review queue</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Caseworker reports and general feedback. Reviewing or resolving a
            report does not edit the published directory.
          </p>
        </div>
        {!reports.length && (
          <p className="text-muted-foreground">No reports on this page.</p>
        )}
        <ul className="flex flex-col gap-4">
          {reports.slice(0, 50).map((report) => (
            <li
              key={report.id}
              className="rounded-xl border border-border bg-card p-5 text-card-foreground"
            >
              <article className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">
                    {report.resourceName}
                  </h2>
                  <time
                    dateTime={report.createdAt.toISOString()}
                    className="text-sm text-muted-foreground"
                  >
                    {report.createdAt
                      .toISOString()
                      .replace("T", " ")
                      .slice(0, 16)}{" "}
                    UTC
                  </time>
                </div>
                <p className="text-sm">
                  {report.category} ·{" "}
                  {ISSUE_REASONS[report.reason as keyof typeof ISSUE_REASONS] ||
                    report.reason}
                </p>
                {report.details && (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {report.details}
                  </p>
                )}
                <details>
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    Resource reference
                  </summary>
                  <p className="break-all text-sm text-muted-foreground">
                    {report.resourceKey}
                  </p>
                </details>
                <form
                  action={updateReportStatus}
                  className="flex flex-wrap items-center gap-3"
                >
                  <input type="hidden" name="id" value={report.id} />
                  <label
                    htmlFor={`status-${report.id}`}
                    className="text-sm font-medium"
                  >
                    Status
                  </label>
                  <select
                    id={`status-${report.id}`}
                    name="status"
                    defaultValue={report.status}
                    className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="new">New</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <Button size="sm" variant="outline" type="submit">
                    Save status
                  </Button>
                </form>
              </article>
            </li>
          ))}
        </ul>
        <nav aria-label="Report pages" className="flex justify-between gap-3">
          {page > 0 ? (
            <Link
              href={`/admin/issues?page=${page - 1}`}
              className="text-sm text-primary underline"
            >
              Previous page
            </Link>
          ) : (
            <span />
          )}{" "}
          {reports.length > 50 && (
            <Link
              href={`/admin/issues?page=${page + 1}`}
              className="text-sm text-primary underline"
            >
              Next page
            </Link>
          )}
        </nav>
      </div>
    </main>
  );
}
