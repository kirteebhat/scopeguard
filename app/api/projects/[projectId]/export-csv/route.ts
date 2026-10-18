import { NextRequest } from "next/server";
import { getProjectById } from "@/lib/data/projects";
import { getProjectChangeRequests } from "@/lib/data/change-requests";
import { getWorkspaceContextOrRedirect } from "@/lib/data/auth-context";
import { generateProjectChangesCsv } from "@/lib/domain/exportCsv";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  try {
    const { projectId } = await params;

    // Verify authenticated session and workspace membership
    await getWorkspaceContextOrRedirect();

    // Fetch project (enforcing workspace authorization)
    const project = await getProjectById(projectId);
    const changes = await getProjectChangeRequests(projectId);

    const csvContent = generateProjectChangesCsv(changes, {
      projectName: project.name,
      clientName: project.clientName,
      currency: project.currency,
    });

    const safeSlug = project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "project";

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `scopeguard-${safeSlug}-changes-${dateStr}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export CSV";
    return new Response(JSON.stringify({ error: message }), {
      status: error && typeof error === "object" && "statusCode" in error ? (error as { statusCode: number }).statusCode : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

