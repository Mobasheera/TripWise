export type ItineraryItem = { id: string; title: string; date: string; time?: string; location?: string };

export function groupItineraryByDate(items: ItineraryItem[]) {
  return items.reduce<Record<string, ItineraryItem[]>>((groups,item) => {
    (groups[item.date] ??= []).push(item);
    return groups;
  }, {});
}
