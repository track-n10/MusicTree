import { prisma } from "./index.js";
import { type Track, type Album, type Artist, type PlatformLink, type PlatformFailure, normalizeText, normalizeCode } from "@music-link-finder/core";
import { EntityType, SearchMode, SearchStatus } from "@prisma/client";

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

  async saveResults(results: SearchResult[]): Promise<void> {
    try {
      for (const result of results) {
        if (result.type === "track") {
          // Minimal persistence: Save Track
          await prisma.track.create({
            data: {
              title: result.title,
              normalizedTitle: normalizeText(result.title),
              isrc: result.isrc,
              durationMs: result.durationMs,
              explicit: result.explicit,
            }
          });
        }
      }
    } catch (error) {
      console.error("Failed to save results:", error);
    }
  }
}
