import Link from "next/link";

import type { AwardUserCertificates, PublicGalleryCertificate } from "@/lib/contracts/award-gallery";
import { MAX_AWARD_LEVEL_FILTERS } from "@/lib/award-gallery";
import { buildPageWindow } from "@/lib/page-window";
import { CertificateCard } from "../certificate-card";

const pageChip =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const inactiveChip = `${pageChip} border-border bg-background text-foreground hover:border-primary/40`;
const activeChip = `${pageChip} border-primary bg-primary font-semibold text-primary-foreground`;
const levelChip =
  "inline-flex min-h-10 items-center rounded-full border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const levelOn = `${levelChip} border-primary bg-primary/10 font-medium text-primary`;
const levelOff = `${levelChip} border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground`;

export function userAwardsHref(
  userId: string,
  selection: { page?: number; levels?: string[]; excludeLevels?: string[] } = {},
) {
  const base = `/profile/${encodeURIComponent(userId)}/awards`;
  const params = new URLSearchParams();
  if (selection.page !== undefined && selection.page > 1) {
    params.set("page", String(selection.page));
  }
  for (const level of selection.levels ?? []) params.append("levels", level);
  for (const level of selection.excludeLevels ?? []) {
    params.append("excludeLevels", level);
  }
  return params.size ? `${base}?${params}` : base;
}

export function UserAwardGallery({
  data,
  selectedLevels,
  excludedLevels,
}: {
  data: AwardUserCertificates;
  selectedLevels?: string[];
  excludedLevels?: string[];
}) {
  const allLevels = data.levels.map((item) => item.level);
  const included = selectedLevels?.length ? new Set(selectedLevels) : null;
  const excludedInput =
    !included && excludedLevels?.length ? new Set(excludedLevels) : null;
  const selected = included
    ? allLevels.filter((level) => included.has(level))
    : excludedInput
      ? allLevels.filter((level) => !excludedInput.has(level))
      : allLevels;
  const excluded = allLevels.filter((level) => !selected.includes(level));
  const filterActive = included !== null || excludedInput !== null;
  const filteredCount = data.levels
    .filter((item) => selected.includes(item.level))
    .reduce((sum, item) => sum + item.certificateCount, 0);

  const levelSelection = (next: string[]) => {
    if (next.length === allLevels.length) return {};
    const nextExcluded = allLevels.filter((level) => !next.includes(level));
    if (next.length === 0) {
      return allLevels.length <= MAX_AWARD_LEVEL_FILTERS
        ? { excludeLevels: allLevels }
        : {};
    }
    if (next.length <= MAX_AWARD_LEVEL_FILTERS && next.length <= nextExcluded.length) {
      return { levels: next };
    }
    if (nextExcluded.length <= MAX_AWARD_LEVEL_FILTERS) {
      return { excludeLevels: nextExcluded };
    }
    return {};
  };
  const activeSelection = levelSelection(selected);
  const toggleHref = (level: string) => {
    const next = selected.includes(level)
      ? selected.filter((item) => item !== level)
      : allLevels.filter((item) => selected.includes(item) || item === level);
    return userAwardsHref(data.userId, levelSelection(next));
  };

  const groups: {
    level: string;
    start: number;
    awards: PublicGalleryCertificate[];
  }[] = [];
  for (const [index, award] of data.awards.entries()) {
    const previous = groups[groups.length - 1];
    if (previous?.level === award.level) previous.awards.push(award);
    else groups.push({ level: award.level, start: index, awards: [award] });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link
          href={`/profile/${encodeURIComponent(data.userId)}`}
          className="inline-flex items-center gap-1.5 rounded-md text-sm text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          ← 返回个人名人堂
        </Link>
        <h1 className="break-words text-2xl font-bold text-slate-950">
          {data.userName} 的获奖证书
        </h1>
        <p className="text-sm text-muted-foreground">
          已公开<span className="whitespace-nowrap">{data.certificateCount}份</span>获奖证书，
          {filterActive && (
            <>当前筛选<span className="whitespace-nowrap">{filteredCount}份</span>，</>
          )}
          本页<span className="whitespace-nowrap">{data.awards.length}份</span>。
        </p>
        <ul aria-label="按奖项等级筛选" className="flex flex-wrap gap-2">
          {data.levels.map(({ level, certificateCount }) => {
            const isOn = selected.includes(level);
            return (
              <li key={level} className="min-w-0 break-words">
                <Link
                  prefetch={false}
                  aria-current={isOn ? "true" : undefined}
                  title={isOn ? `取消筛选${level}` : `筛选${level}`}
                  className={isOn ? levelOn : levelOff}
                  href={toggleHref(level)}
                >
                  {level}
                  <span className="ml-2 text-xs tabular-nums opacity-75">
                    {certificateCount}份
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {!data.awards.length && (
        <p className="text-sm text-muted-foreground">
          当前筛选条件下暂无公开证书。
        </p>
      )}

      {groups.map((group) => (
        <section key={group.awards[0].id}>
          <h2 className="mb-4 break-words text-base font-semibold">
            {group.level}
            <span className="ml-3 whitespace-nowrap text-sm font-normal text-muted-foreground">
              本页{group.awards.length}份
            </span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.awards.map((award, index) => (
              <CertificateCard
                key={award.id}
                award={award}
                level={group.level}
                nearViewport={group.start + index >= 4}
              />
            ))}
          </div>
        </section>
      ))}

      <nav aria-label="获奖证书分页" className="flex flex-wrap items-center gap-3">
        {data.page.pageNumber > 1 ? (
          <Link
            prefetch={false}
            className={inactiveChip}
            href={userAwardsHref(data.userId, {
              ...activeSelection,
              page: data.page.pageNumber - 1,
            })}
          >
            上一页
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={`${pageChip} border-border text-muted-foreground opacity-50`}
          >
            上一页
          </span>
        )}
        <ol aria-label="页码" className="flex flex-wrap items-center gap-1">
          {buildPageWindow(data.page.pageNumber, data.page.pageCount, {
            radius: 2,
          }).map((item, index) =>
            item === "ellipsis" ? (
              <li
                key={`gap-${index}`}
                aria-hidden="true"
                className="px-2 text-sm text-muted-foreground"
              >
                …
              </li>
            ) : (
              <li key={item}>
                {item === data.page.pageNumber ? (
                  <span aria-current="page" className={activeChip}>
                    {item}
                  </span>
                ) : (
                  <Link
                    prefetch={false}
                    className={inactiveChip}
                    href={userAwardsHref(data.userId, {
                      ...activeSelection,
                      page: item,
                    })}
                  >
                    {item}
                  </Link>
                )}
              </li>
            ),
          )}
        </ol>
        {data.page.pageNumber < data.page.pageCount ? (
          <Link
            prefetch={false}
            className={inactiveChip}
            href={userAwardsHref(data.userId, {
              ...activeSelection,
              page: data.page.pageNumber + 1,
            })}
          >
            下一页
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={`${pageChip} border-border text-muted-foreground opacity-50`}
          >
            下一页
          </span>
        )}
        <span className="text-sm text-muted-foreground">
          {data.page.pageNumber}/{data.page.pageCount}页
        </span>
        <form
          action={userAwardsHref(data.userId)}
          method="get"
          className="flex items-center gap-2"
        >
          {activeSelection.levels &&
            selected.map((level) => (
              <input key={level} type="hidden" name="levels" value={level} />
            ))}
          {activeSelection.excludeLevels &&
            excluded.map((level) => (
              <input
                key={level}
                type="hidden"
                name="excludeLevels"
                value={level}
              />
            ))}
          <label
            htmlFor="user-award-page-jump"
            className="text-sm text-muted-foreground"
          >
            跳转
          </label>
          <input
            id="user-award-page-jump"
            name="page"
            type="number"
            min={1}
            max={data.page.pageCount}
            required
            className="h-11 w-16 rounded-full border border-border bg-background px-3 text-center text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
          <button type="submit" className={inactiveChip}>
            跳转
          </button>
        </form>
      </nav>
    </div>
  );
}
