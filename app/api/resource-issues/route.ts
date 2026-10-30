import { issuesDb, resourceIssueReports } from "@/lib/resource-issues-db";
import { ISSUE_REASONS } from "@/lib/resource-finder";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (origin) {
    try {
      if (new URL(origin).host !== host)
        return Response.json({ error: "Invalid origin" }, { status: 403 });
    } catch {
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    }
  }
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Expected JSON" }, { status: 415 });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Missing body" }, { status: 400 });
  let raw = "";
  let size = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 20000) {
        await reader.cancel();
        return Response.json({ error: "Report too large" }, { status: 413 });
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object")
      return Response.json({ error: "Invalid report" }, { status: 400 });
    const input = body as Record<string, unknown>;
    const bounded = (value: unknown, max: number, min = 1): value is string =>
      typeof value === "string" &&
      value.trim().length >= min &&
      value.length <= max &&
      !value.includes("\u0000");
    if (
      !bounded(input.id, 36) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        input.id,
      ) ||
      !bounded(input.resourceKey, 2000) ||
      !bounded(input.resourceName, 500) ||
      !bounded(input.category, 20) ||
      !["internet", "devices", "skills", "general"].includes(input.category) ||
      !bounded(input.reason, 40) ||
      ![...Object.keys(ISSUE_REASONS), "bug"].includes(input.reason) ||
      !bounded(
        input.details,
        2000,
        input.category === "general" || input.reason === "other" ? 1 : 0,
      )
    ) {
      return Response.json({ error: "Invalid report fields" }, { status: 400 });
    }
    await issuesDb
      .insert(resourceIssueReports)
      .values({
        id: input.id,
        resourceKey: input.resourceKey.trim(),
        resourceName: input.resourceName.trim(),
        category: input.category,
        reason: input.reason,
        details: input.details.trim(),
      })
      .onConflictDoNothing({ target: resourceIssueReports.id });
    return Response.json({ saved: true }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError)
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    console.error("Resource report could not be saved");
    return Response.json({ error: "Unable to save report" }, { status: 503 });
  }
}
