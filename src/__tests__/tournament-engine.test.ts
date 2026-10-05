import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateAvailableSlots } from "../lib/tournament-engine";

test("slot calculation reports remaining capacity", () => {
  assert.deepEqual(calculateAvailableSlots(32, 12), { availableSlots: 20, isFull: false });
});

test("slot calculation marks a full tournament", () => {
  assert.deepEqual(calculateAvailableSlots(32, 32), { availableSlots: 0, isFull: true });
});

test("slot calculation never reports negative availability", () => {
  assert.deepEqual(calculateAvailableSlots(32, 35), { availableSlots: 0, isFull: true });
});
