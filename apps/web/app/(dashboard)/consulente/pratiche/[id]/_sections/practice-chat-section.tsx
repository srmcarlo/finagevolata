import { getMessages } from "@/lib/actions/chat";
import { PracticeChat } from "@/components/practice-chat";

export async function PracticeChatSection({
  practiceId,
  currentUserId,
}: {
  practiceId: string;
  currentUserId: string | undefined;
}) {
  const messages = await getMessages(practiceId);
  return (
    <PracticeChat
      practiceId={practiceId}
      messages={messages as any}
      currentUserId={currentUserId}
    />
  );
}
