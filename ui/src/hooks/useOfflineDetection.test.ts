import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { formatDowntime } from "./useOfflineDetection.ts";

Deno.test("formatDowntime - formats milliseconds correctly", () => {
  assertEquals(formatDowntime(500), "less than a second");
  assertEquals(formatDowntime(1500), "1 second");
  assertEquals(formatDowntime(2500), "2 seconds");
});

Deno.test("formatDowntime - formats minutes correctly", () => {
  assertEquals(formatDowntime(60000), "1 minute");
  assertEquals(formatDowntime(120000), "2 minutes");
  assertEquals(formatDowntime(90000), "1 minute and 30 seconds");
  assertEquals(formatDowntime(150000), "2 minutes and 30 seconds");
});

Deno.test("formatDowntime - formats hours correctly", () => {
  assertEquals(formatDowntime(3600000), "1 hour");
  assertEquals(formatDowntime(7200000), "2 hours");
  assertEquals(formatDowntime(3660000), "1 hour and 1 minute");
  assertEquals(formatDowntime(7320000), "2 hours and 2 minutes");
});

Deno.test("formatDowntime - handles edge cases", () => {
  assertEquals(formatDowntime(0), "less than a second");
  assertEquals(formatDowntime(999), "less than a second");
  assertEquals(formatDowntime(1000), "1 second");
  assertEquals(formatDowntime(59000), "59 seconds");
  assertEquals(formatDowntime(3599000), "59 minutes and 59 seconds");
});

Deno.test("useOfflineDetection - types and interfaces", async () => {
  // Test that the hook exports exist and have correct types
  const { useOfflineDetection } = await import("./useOfflineDetection.ts");
  assertEquals(typeof useOfflineDetection, "function");
});