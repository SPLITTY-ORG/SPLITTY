import { describe, expect, it } from "vitest";
import { decodeFunctionData, getAddress, parseUnits, type Address } from "viem";
import { buildTransferCalls, FORWARDER_ADDRESS } from "./multicall";

const TOKEN = "0x3600000000000000000000000000000000000000" as Address;
const SENDER = "0x0000000000000000000000000000000000000001" as Address;
const ALICE = "0x1111111111111111111111111111111111111111" as Address;
const BOB = "0x2222222222222222222222222222222222222222" as Address;

const transferAbi = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "transfer",
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/** Read back what a built call will actually ask the token to do. */
const decode = (callData: `0x${string}`) => {
  const { args } = decodeFunctionData({ abi: transferAbi, data: callData });
  return { to: args[0] as string, value: args[1] as bigint };
};

describe("buildTransferCalls", () => {
  it("builds one call per recipient, aimed at the token", () => {
    const calls = buildTransferCalls(
      TOKEN,
      SENDER,
      [
        { address: ALICE, amount: "10" },
        { address: BOB, amount: "5" },
      ],
      6
    );
    expect(calls).toHaveLength(2);
    expect(calls.every((c) => c.target === TOKEN)).toBe(true);
  });

  it("encodes the recipient and amount the user asked for", () => {
    const [call] = buildTransferCalls(TOKEN, SENDER, [{ address: ALICE, amount: "12.5" }], 6);
    expect(decode(call.callData)).toEqual({
      to: getAddress(ALICE),
      value: parseUnits("12.5", 6),
    });
  });

  it("scales by the token's decimals, not a fixed 6", () => {
    const [six] = buildTransferCalls(TOKEN, SENDER, [{ address: ALICE, amount: "1" }], 6);
    const [eighteen] = buildTransferCalls(TOKEN, SENDER, [{ address: ALICE, amount: "1" }], 18);
    expect(decode(six.callData).value).toBe(parseUnits("1", 6));
    expect(decode(eighteen.callData).value).toBe(parseUnits("1", 18));
  });

  it("checksums a lowercase address", () => {
    const [call] = buildTransferCalls(
      TOKEN,
      SENDER,
      [{ address: ALICE.toLowerCase(), amount: "1" }],
      6
    );
    expect(decode(call.callData).to).toBe(getAddress(ALICE));
  });

  it("keeps recipients in the order they were given", () => {
    const calls = buildTransferCalls(
      TOKEN,
      SENDER,
      [
        { address: BOB, amount: "1" },
        { address: ALICE, amount: "2" },
      ],
      6
    );
    expect(calls.map((c) => decode(c.callData).to)).toEqual([
      getAddress(BOB),
      getAddress(ALICE),
    ]);
  });

  it("sets allowFailure, so one bad transfer cannot revert the batch", () => {
    // This is why resolveOutcomes exists: the transaction can succeed with
    // individual transfers reverted, so success has to be read per recipient.
    const calls = buildTransferCalls(TOKEN, SENDER, [{ address: ALICE, amount: "1" }], 6);
    expect(calls[0].allowFailure).toBe(true);
  });

  it("returns nothing for an empty recipient list", () => {
    expect(buildTransferCalls(TOKEN, SENDER, [], 6)).toEqual([]);
  });

  it("rejects an address that is not an address", () => {
    expect(() =>
      buildTransferCalls(TOKEN, SENDER, [{ address: "nope", amount: "1" }], 6)
    ).toThrow();
  });

  it("rounds up when an amount has more decimals than the token", () => {
    // Documents current behaviour, which is a real hazard: viem's parseUnits
    // rounds rather than truncates, so a CSV row of 1.9999999 sends 2.
    // CSV import only checks that the amount parses and is positive, so this
    // reaches the chain. Captured here so any fix is a deliberate change.
    const [call] = buildTransferCalls(
      TOKEN,
      SENDER,
      [{ address: ALICE, amount: "1.9999999" }],
      6
    );
    expect(decode(call.callData).value).toBe(parseUnits("2", 6));
  });

  it("points at the forwarder that the caller will aggregate through", () => {
    expect(FORWARDER_ADDRESS).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });
});
