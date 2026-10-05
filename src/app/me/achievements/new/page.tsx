import { redirect } from "next/navigation";

export default function LegacyAchievementNewRedirect() {
  redirect("/me/experiences/new");
}
