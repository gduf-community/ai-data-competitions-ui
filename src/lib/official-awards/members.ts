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
