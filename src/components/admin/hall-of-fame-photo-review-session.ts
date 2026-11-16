import type { AdminHallOfFamePhotoRequest } from "@/lib/contracts/profiles";

export interface PhotoReviewPage {
  rows: AdminHallOfFamePhotoRequest[];
  total: number;
  canManage: boolean;
  canViewPreview: boolean;
}

/** One dialog opening owns its refreshes, including reopening the same request. */
export function createPhotoReviewSession(requestId: string) {
  let closed = false;
  let pending: AbortController | null = null;

  return {
    cancel() {
      closed = true;
      pending?.abort();
    },
    async refresh(options: {
      loadCurrent: (signal: AbortSignal) => Promise<PhotoReviewPage>;
      loadAll: (signal: AbortSignal) => Promise<PhotoReviewPage>;
      applyCurrent: (page: PhotoReviewPage) => void;
      applyLatest: (
        page: PhotoReviewPage,
        request: AdminHallOfFamePhotoRequest | null,
      ) => void;
      onError: (error: unknown) => void;
    }): Promise<AdminHallOfFamePhotoRequest | null> {
      if (closed) return null;
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      const isCurrent = () => !closed && !controller.signal.aborted;

      try {
        let page = await options.loadCurrent(controller.signal);
        if (!isCurrent()) return null;
        options.applyCurrent(page);
        let found = page.rows.find((item) => item.id === requestId) ?? null;
        if (!found) {
          page = await options.loadAll(controller.signal);
          if (!isCurrent()) return null;
          found = page.rows.find((item) => item.id === requestId) ?? null;
        }
        options.applyLatest(page, found);
        return found;
      } catch (error) {
        if (isCurrent()) options.onError(error);
        return null;
      } finally {
        if (pending === controller) pending = null;
      }
    },
  };
}
