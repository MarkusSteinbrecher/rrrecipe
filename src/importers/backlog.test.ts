import { describe, expect, it } from "vitest";
import { hasBacklogEndpoint } from "./backlog";

describe("hasBacklogEndpoint", () => {
  it("returns false when no browser host or explicit endpoint is available", () => {
    expect(hasBacklogEndpoint()).toBe(false);
  });
});
