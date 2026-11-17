export type AwardReviewListState = "loading" | "empty" | "filtered-empty" | "list";

/** Keep loading, a genuinely empty API result and a filtered-to-zero grid distinct. */
export function awardReviewListState(input: {
  loading: boolean;
  total: number;
  visible: number;
}): AwardReviewListState {
  if (input.loading) return "loading";
  if (input.total === 0) return "empty";
  if (input.visible === 0) return "filtered-empty";
  return "list";
}
