import { Badge } from "@/components/ui/badge";
import {
  competitionRecognitionClassNameMap,
  competitionRecognitionLabelMap,
  type CompetitionRecognition,
} from "@/lib/competition-recognition";
import { cn } from "@/lib/utils";

interface CompetitionRecognitionBadgeProps {
  recognition: CompetitionRecognition;
}

export function CompetitionRecognitionBadge({
  recognition,
}: CompetitionRecognitionBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1",
        competitionRecognitionClassNameMap[recognition],
      )}
    >
      {competitionRecognitionLabelMap[recognition]}
    </Badge>
  );
}
