import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const aiAgents = read("../.github/workflows/ai-agents.yml");
const connectivity = read("../.github/workflows/ai-org-connectivity.yml");
const contractLock = read("../.github/workflows/contract-lock.yml");
const protectedPaths = read("../.github/workflows/protected-paths.yml");
const handbookRef = "de790c94a13de3937da3841fd23691ee9fc861c6";

describe("Parent Plus AI Org integration security", () => {
  it("requires a private repository and explicit unattended opt-in for autonomous agents", () => {
    expect(aiAgents).toContain("vars.UNATTENDED_AGENTS == 'on'");
    expect(aiAgents).toContain("github.event.repository.private == true");
    expect(aiAgents).toContain("AI_ORG_HANDBOOK_SSH_KEY");
    expect(aiAgents).toContain("GROQ_API_KEY");
    expect(aiAgents).not.toContain("NVIDIA_NIM_API_KEY");
    expect(aiAgents).not.toContain("ANTHROPIC_API_KEY");
    expect(aiAgents).not.toContain("OPENAI_API_KEY");
  });

  it("pins every reusable AI Org workflow to the same verified immutable revision", () => {
    for (const workflow of [aiAgents, connectivity, contractLock, protectedPaths]) {
      const pins = [...workflow.matchAll(/parent-plus-ai-org\/.github\/workflows\/[\w-]+\.yml@([a-f0-9]{40})/g)].map(m => m[1]);
      expect(pins.length).toBeGreaterThan(0);
      expect(pins.every(pin => pin === handbookRef)).toBe(true);
    }
  });

  it("passes the read-only handbook key only to workflows that load the private handbook", () => {
    expect(aiAgents).toContain("AI_ORG_HANDBOOK_SSH_KEY: ${{ secrets.AI_ORG_HANDBOOK_SSH_KEY }}");
    expect(connectivity).toContain("AI_ORG_HANDBOOK_SSH_KEY: ${{ secrets.AI_ORG_HANDBOOK_SSH_KEY }}");
    expect(contractLock).toContain("AI_ORG_HANDBOOK_SSH_KEY: ${{ secrets.AI_ORG_HANDBOOK_SSH_KEY }}");
  });
});
