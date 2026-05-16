import { prisma } from "./index.js";
import { type PlatformFailure } from "@music-link-finder/core";
import { SearchMode, SearchStatus } from "@prisma/client";

export class MusicRepository {
  async logSearch(mode: SearchMode, query: string, status: SearchStatus, durationMs: number, failures: PlatformFailure[]): Promise<void> {
    try {
      await prisma.searchRun.create({
        data: {
          mode,
          query,
          status,
          durationMs,
          partialFailures: failures as any
        }
      });
    } catch (error) {
      console.error("Failed to log search run:", error);
    }
  }
}
