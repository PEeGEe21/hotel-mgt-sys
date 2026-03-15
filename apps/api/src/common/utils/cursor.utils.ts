export type Cursor = { createdAt: Date; id: string };

export function parseCursor(cursor?: string): Cursor | null {
  if (!cursor) return null;
  const [createdAtRaw, id] = cursor.split('|');
  if (!createdAtRaw || !id) return null;
  const createdAt = new Date(createdAtRaw);
  if (Number.isNaN(createdAt.getTime())) return null;
  return { createdAt, id };
}

export function buildCursor(item: { createdAt: Date; id: string }) {
  return `${item.createdAt.toISOString()}|${item.id}`;
}

export function buildCursorWhere(cursor: Cursor) {
  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ],
  };
}
