export type ItineraryItem = {
  title: string;
  date: string;
  location?: string;
  type: "travel" | "stay" | "activity" | "food" | "other";
};

export function groupItineraryByDate(items: ItineraryItem[]) {
  return items.reduce<Record<string, ItineraryItem[]>>((groups, item) => {
    (groups[item.date] ??= []).push(item);
    return groups;
  }, {});
}
