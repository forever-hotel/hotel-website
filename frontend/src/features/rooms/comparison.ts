export const MAX_COMPARISON_ROOMS = 3;

export function toggleComparisonRoom(
  selected: string[],
  roomId: string,
): string[] {
  if (selected.includes(roomId)) return selected.filter((id) => id !== roomId);
  if (selected.length >= MAX_COMPARISON_ROOMS) return selected;
  return [...selected, roomId];
}
