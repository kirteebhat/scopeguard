import { redirect } from "next/navigation";

interface ProjectNewChangePageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectNewChangePage({ params }: ProjectNewChangePageProps) {
  const { projectId } = await params;
  redirect(`/changes/new?projectId=${projectId}`);
}

