import type { ItemSize } from "@/types/home";

/** Match CSS grid-auto-flow: row dense; total area alone misses fragmented rows. */
export function homeGridRows(sizes: ItemSize[], cols: number): number {
  const occupied: boolean[][] = [];
  for (const size of sizes) {
    const width = Math.min(size.w, cols);
    const height = cols === 2 ? Math.min(size.h, 2) : size.h;
    let placed = false;
    for (let row = 0; !placed; row++) {
      for (let column = 0; column <= cols - width; column++) {
        let free = true;
        for (let y = row; y < row + height; y++) {
          for (let x = column; x < column + width; x++) if (occupied[y]?.[x]) free = false;
        }
        if (!free) continue;
        for (let y = row; y < row + height; y++) {
          occupied[y] ??= [];
          for (let x = column; x < column + width; x++) occupied[y]![x] = true;
        }
        placed = true;
        break;
      }
    }
  }
  return occupied.length;
}
