import { PracticeTimeline } from "@/components/practice-timeline";

export async function PracticeTimelineSection({ practiceId }: { practiceId: string }) {
  return <PracticeTimeline practiceId={practiceId} />;
}
