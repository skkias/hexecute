import { CoachLoginForm } from "@/components/coach/CoachLoginForm";

export default function CoachLoginPage() {
  const configured = Boolean(process.env.COACH_PASSWORD);

  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-16">
      <CoachLoginForm configured={configured} />
    </main>
  );
}
