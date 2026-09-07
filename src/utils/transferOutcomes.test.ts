import { describe, expect, it } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  parseUnits,
  type Address,
} from "viem";
import {
  TRANSFER_EVENT_ABI,
  decodeTransfers,
  resolveOutcomes,
} from "./transferOutcomes";

const TOKEN = "0x3600000000000000000000000000000000000000" as Address;
const OTHER_TOKEN = "0x9999999999999999999999999999999999999999" as Address;
const SENDER = "0x0000000000000000000000000000000000000001" as Address;

const ALICE = "0x1111111111111111111111111111111111111111" as Address;
const BOB = "0x2222222222222222222222222222222222222222" as Address;
const CAROL = "0x3333333333333333333333333333333333333333" as Address;

/** Build a receipt log the way a real ERC-20 Transfer would appear. */
const log = (token: Address, to: Address, amount: string) => {
  const topics = encodeEventTopics({
    abi: [TRANSFER_EVENT_ABI],
    eventName: "Transfer",
    args: { from: SENDER, to },
  });
  const data = encodeAbiParameters([{ type: "uint256" }], [parseUnits(amount, 6)]);
  return { address: token, data, topics };
};

const paid = (o: { success: boolean }[]) => o.map((x) => x.success);

describe("decodeTransfers", () => {
  it("reads Transfer events for the token being sent", () => {
    const transfers = decodeTransfers(
      [log(TOKEN, ALICE, "10"), log(TOKEN, BOB, "5")],
      TOKEN
    );
    expect(transfers).toHaveLength(2);
    expect(transfers[0].value).toBe(parseUnits("10", 6));
  });

  it("ignores logs emitted by other contracts", () => {
    const transfers = decodeTransfers(
      [log(TOKEN, ALICE, "10"), log(OTHER_TOKEN, BOB, "5")],
      TOKEN
    );
    expect(transfers).toHaveLength(1);
    expect(transfers[0].to.toLowerCase()).toBe(ALICE.toLowerCase());
  });

  it("matches the token address case-insensitively", () => {
    expect(
      decodeTransfers([log(TOKEN, ALICE, "1")], TOKEN.toUpperCase() as Address)
    ).toHaveLength(1);
  });

  it("skips logs it cannot decode instead of throwing", () => {
    const junk = { address: TOKEN, data: "0x" as const, topics: [] as const };
    expect(decodeTransfers([junk, log(TOKEN, ALICE, "1")], TOKEN)).toHaveLength(1);
  });
});

describe("resolveOutcomes", () => {
  const recipients = [
    { address: ALICE, amount: "10" },
    { address: BOB, amount: "5" },
    { address: CAROL, amount: "2" },
  ];

  it("marks everyone paid when every transfer emitted an event", () => {
    const transfers = decodeTransfers(
      [log(TOKEN, ALICE, "10"), log(TOKEN, BOB, "5"), log(TOKEN, CAROL, "2")],
      TOKEN
    );
    expect(paid(resolveOutcomes(transfers, recipients))).toEqual([
      true,
      true,
      true,
    ]);
  });

  it("marks a recipient unpaid when their transfer reverted", () => {
    // allowFailure: true means Bob's transfer can revert while the
    // transaction still succeeds. A reverted transfer emits no event.
    const transfers = decodeTransfers(
      [log(TOKEN, ALICE, "10"), log(TOKEN, CAROL, "2")],
      TOKEN
    );
    expect(paid(resolveOutcomes(transfers, recipients))).toEqual([
      true,
      false,
      true,
    ]);
  });

  it("reports everyone unpaid when the whole batch silently did nothing", () => {
    expect(paid(resolveOutcomes([], recipients))).toEqual([false, false, false]);
  });

  it("needs one event per entry when an address is listed twice", () => {
    const twice = [
      { address: ALICE, amount: "10" },
      { address: ALICE, amount: "10" },
    ];
    const onlyOne = decodeTransfers([log(TOKEN, ALICE, "10")], TOKEN);
    expect(paid(resolveOutcomes(onlyOne, twice))).toEqual([true, false]);

    const both = decodeTransfers(
      [log(TOKEN, ALICE, "10"), log(TOKEN, ALICE, "10")],
      TOKEN
    );
    expect(paid(resolveOutcomes(both, twice))).toEqual([true, true]);
  });

  it("ignores address casing", () => {
    const transfers = decodeTransfers([log(TOKEN, ALICE, "10")], TOKEN);
    const lower = [{ address: ALICE.toLowerCase(), amount: "10" }];
    expect(paid(resolveOutcomes(transfers, lower))).toEqual([true]);
  });

  it("counts a fee-on-transfer token as paid even though less arrived", () => {
    // Reporting this as failed would invite the user to pay twice.
    const transfers = decodeTransfers([log(TOKEN, ALICE, "9.97")], TOKEN);
    expect(paid(resolveOutcomes(transfers, [{ address: ALICE, amount: "10" }]))).toEqual([
      true,
    ]);
  });

  it("does not throw on a malformed recipient address", () => {
    expect(paid(resolveOutcomes([], [{ address: "not-an-address", amount: "1" }]))).toEqual([
      false,
    ]);
  });

  it("returns nothing for an empty recipient list", () => {
    expect(resolveOutcomes([], [])).toEqual([]);
  });
});
