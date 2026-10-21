// 成员编辑：把「草稿 vs 原始成员」折算成 create / update / remove，避免整组替换丢身份。

export type MemberLike = {
  memberId: string;
  name: string;
  grade: string | null;
  college: string | null;
  major: string | null;
};

export type MemberDraft = {
  /** 已有成员保留稳定 ID；新增成员为 null，提交时不发送假 ID。 */
  memberId: string | null;
  name: string;
  grade: string;
  college: string;
  major: string;
};

export type MemberInput = {
  memberId?: string;
  name: string;
  grade: string | null;
  college: string | null;
  major: string | null;
};

export function toDrafts(members: MemberLike[]): MemberDraft[] {
  return members.map((member) => ({
    memberId: member.memberId,
    name: member.name,
    grade: member.grade ?? "",
    college: member.college ?? "",
    major: member.major ?? "",
  }));
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function sameDraft(draft: MemberDraft, member: MemberLike): boolean {
  return (
    draft.name.trim() === member.name &&
    nullable(draft.grade) === member.grade &&
    nullable(draft.college) === member.college &&
    nullable(draft.major) === member.major
  );
}

/**
 * 折算出提交内容：
 * - 有 memberId 且内容变化 → update（带稳定 ID）
 * - 有 memberId 但被删掉 → remove
 * - 无 memberId → create（不发送 memberId）
 */
export function diffMembers(
  original: MemberLike[],
  drafts: MemberDraft[],
): { members: MemberInput[]; removedMemberIds: string[]; created: number; updated: number; removed: number } {
  const byId = new Map(original.map((member) => [member.memberId, member]));
  const keptIds = new Set<string>();
  const members: MemberInput[] = [];
  let created = 0;
  let updated = 0;

  for (const draft of drafts) {
    if (draft.memberId && byId.has(draft.memberId)) {
      const current = byId.get(draft.memberId)!;
      keptIds.add(draft.memberId);
      if (sameDraft(draft, current)) continue;
      updated += 1;
      members.push({
        memberId: draft.memberId,
        name: draft.name.trim(),
        grade: nullable(draft.grade),
        college: nullable(draft.college),
        major: nullable(draft.major),
      });
      continue;
    }
    created += 1;
    members.push({
      name: draft.name.trim(),
      grade: nullable(draft.grade),
      college: nullable(draft.college),
      major: nullable(draft.major),
    });
  }

  const removedMemberIds = original
    .map((member) => member.memberId)
    .filter((memberId) => !keptIds.has(memberId));

  return { members, removedMemberIds, created, updated, removed: removedMemberIds.length };
}

/** 409 之后用于展示差异：返回与原记录相比发生变化的字段名。 */
export function changedFields(
  original: { name: string; grade: string | null; college: string | null; major: string | null },
  draft: MemberDraft,
): string[] {
  const fields: string[] = [];
  if (draft.name.trim() !== original.name) fields.push("姓名");
  if (nullable(draft.grade) !== original.grade) fields.push("年级");
  if (nullable(draft.college) !== original.college) fields.push("学院");
  if (nullable(draft.major) !== original.major) fields.push("专业");
  return fields;
}

/** 指导老师的稳定键：没有 ID，用「姓名|学院」表达身份。 */
export function advisorKey(advisor: { name: string; college: string | null }): string {
  return `${advisor.name}|${advisor.college ?? ""}`;
}

/**
 * 三方合并：baseline（用户打开时的版本）、drafts（用户草稿）、latest（他人提交后的最新版本）。
 * 只把「baseline 有、草稿没有」的记录判为删除，绝不把他人新增的记录当成用户主动删除。
 */
export function mergeThreeWay(params: {
  baselineMembers: MemberLike[];
  drafts: MemberDraft[];
  latestMembers: MemberLike[];
}): {
  members: MemberInput[];
  removedMemberIds: string[];
  created: number;
  updated: number;
  removed: number;
} {
  const { baselineMembers, drafts, latestMembers } = params;
  const baselineById = new Map(baselineMembers.map((member) => [member.memberId, member]));
  const draftById = new Map(
    drafts.filter((draft) => draft.memberId).map((draft) => [draft.memberId as string, draft]),
  );

  // 用户删掉的：baseline 里有、草稿里没有（仅限打开时存在的成员）。
  const removedMemberIds = baselineMembers
    .map((member) => member.memberId)
    .filter((memberId) => !draftById.has(memberId));

  const members: MemberInput[] = [];
  let updated = 0;

  // 以最新版本为基底，应用用户的修改与删除；他人新增的成员保留。
  for (const current of latestMembers) {
    if (removedMemberIds.includes(current.memberId)) continue;
    const draft = draftById.get(current.memberId);
    const base = baselineById.get(current.memberId);
    if (draft && base && !sameDraft(draft, base)) {
      updated += 1;
      members.push({
        memberId: current.memberId,
        name: draft.name.trim(),
        grade: nullable(draft.grade),
        college: nullable(draft.college),
        major: nullable(draft.major),
      });
    }
  }

  const createdDrafts = drafts.filter((draft) => !draft.memberId);
  for (const draft of createdDrafts) {
    members.push({
      name: draft.name.trim(),
      grade: nullable(draft.grade),
      college: nullable(draft.college),
      major: nullable(draft.major),
    });
  }

  return {
    members,
    removedMemberIds,
    created: createdDrafts.length,
    updated,
    removed: removedMemberIds.length,
  };
}

/** 指导老师同样做三方合并，避免用旧数组覆盖他人新增。 */
export function mergeAdvisors(params: {
  baseline: Array<{ name: string; college: string | null }>;
  drafts: Array<{ name: string; college: string }>;
  latest: Array<{ name: string; college: string | null }>;
}): Array<{ name: string; college: string | null }> {
  const baselineKeys = new Set(params.baseline.map(advisorKey));
  const draftKeys = new Set(params.drafts.filter((d) => d.name.trim()).map((d) => advisorKey({ name: d.name.trim(), college: nullable(d.college) })));
  const removed = new Set([...baselineKeys].filter((key) => !draftKeys.has(key)));

  const result = params.latest
    .filter((advisor) => !removed.has(advisorKey(advisor)))
    .map((advisor) => ({ name: advisor.name, college: advisor.college }));

  const existing = new Set(result.map(advisorKey));
  for (const draft of params.drafts) {
    if (!draft.name.trim()) continue;
    const key = advisorKey({ name: draft.name.trim(), college: nullable(draft.college) });
    if (existing.has(key) || baselineKeys.has(key)) continue;
    existing.add(key);
    result.push({ name: draft.name.trim(), college: nullable(draft.college) });
  }
  return result;
}