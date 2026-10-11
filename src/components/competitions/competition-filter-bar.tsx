import { SearchQueryForm } from "@/components/shared/search-query-form";
import { competitionStatusLabelMap, publicCompetitionFilterStatuses } from "@/lib/competition-status";
import type { CompetitionStatus } from "@/lib/types";
import type { SearchQuery } from "@/lib/search";
export function CompetitionFilterBar({ query, status, year, parameters, allowRegex = false }: {
  query: SearchQuery; status: CompetitionStatus | "all"; year: number | null; parameters?: string;
  allowRegex?: boolean;
}) {
  const params = new URLSearchParams(parameters);
  if (year !== null) params.set("year", String(year));
  return <SearchQueryForm path="/competitions" query={query} parameters={params.toString()} status={status} allowRegex={allowRegex}
    placeholder="搜索比赛名称、类别或归属学院"
    statuses={publicCompetitionFilterStatuses.map(value => ({ value, label: competitionStatusLabelMap[value] }))} />;
}
