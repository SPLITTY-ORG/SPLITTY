import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { pad, parseUnits, type Address, type Hex } from "viem";
import { bridgeToArc, pollTransferStatus } from "./gatewayBridge";
import {
  GATEWAY_MINTER_ADDRESS,
  GATEWAY_WALLET_ADDRESS,
  chainConfig,
} from "../config/gateway";

const WALLET = "0x1111111111111111111111111111111111111111" as Address;

const jsonOk = (body: unknown) => ({ ok: true, json: async () => body });
const httpFail = (status = 500) => ({
  ok: false,
  status,
  text: async () => "upstream error",
});

/** The shape the estimate endpoint replies with. */
const estimate = (maxFee = "1000", maxBlockHeight = "99999") =>
  jsonOk({ body: [{ burnIntent: { maxFee, maxBlockHeight } }] });

const padded = (a: string) => pad(a.toLowerCase() as Hex, { size: 32 });

describe("pollTransferStatus", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns as soon as the transfer is finalized", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonOk({ status: "finalized", transactionHash: "0xabc" })
      )
    );
    await expect(pollTransferStatus("t1")).resolves.toEqual({
      status: "finalized",
      transactionHash: "0xabc",
    });
  });

  it("accepts confirmed as well as finalized", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk({ status: "confirmed" })));
    await expect(pollTransferStatus("t1")).resolves.toMatchObject({
      status: "confirmed",
    });
  });

  it("keeps polling while the transfer is still pending", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk({ status: "pending" }))
      .mockResolvedValueOnce(jsonOk({ status: "pending" }))
      .mockResolvedValue(jsonOk({ status: "finalized", transactionHash: "0xdone" }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = pollTransferStatus("t1");
    await vi.advanceTimersByTimeAsync(15000);

    await expect(pending).resolves.toMatchObject({ transactionHash: "0xdone" });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it("retries rather than giving up when the API returns an error status", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(httpFail(502))
      .mockResolvedValue(jsonOk({ status: "finalized" }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = pollTransferStatus("t1");
    await vi.advanceTimersByTimeAsync(10000);

    await expect(pending).resolves.toMatchObject({ status: "finalized" });
  });

  it("throws when the transfer fails, naming the reason", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonOk({
          status: "failed",
          forwardingDetails: { failureReason: "insufficient balance" },
        })
      )
    );
    await expect(pollTransferStatus("t1")).rejects.toThrow("insufficient balance");
  });

  it("throws when the transfer expires", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk({ status: "expired" })));
    await expect(pollTransferStatus("t1")).rejects.toThrow(/expired/);
  });

  it("says unknown when a failure carries no reason", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk({ status: "failed" })));
    await expect(pollTransferStatus("t1")).rejects.toThrow("unknown");
  });

  it("reports pending, not failure, once the timeout passes", async () => {
    // The transfer is still in flight. Reporting a failure here would
    // invite the user to bridge a second time for money already moving.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk({ status: "pending" })));

    const watching = pollTransferStatus("t1", 10000);
    await vi.advanceTimersByTimeAsync(20000);

    await expect(watching).resolves.toEqual({ status: "pending", reason: "timeout" });
  });

  it("reports stopped when the caller gives up early", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk({ status: "pending" })));
    const controller = new AbortController();

    const watching = pollTransferStatus("t1", 600000, controller.signal);
    await vi.advanceTimersByTimeAsync(5000);
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);

    await expect(watching).resolves.toEqual({ status: "pending", reason: "stopped" });
  });

  it("stops without waiting out the rest of the poll interval", async () => {
    // Aborting mid-sleep has to wake the wait, otherwise "stop waiting"
    // would still hang for up to five seconds.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk({ status: "pending" })));
    const controller = new AbortController();

    const watching = pollTransferStatus("t1", 600000, controller.signal);
    await vi.advanceTimersByTimeAsync(1);
    controller.abort();
    await vi.advanceTimersByTimeAsync(1);

    await expect(watching).resolves.toMatchObject({ reason: "stopped" });
  });

  it("returns immediately when the signal is already aborted", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonOk({ status: "pending" }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    controller.abort();

    await expect(
      pollTransferStatus("t1", 600000, controller.signal)
    ).resolves.toEqual({ status: "pending", reason: "stopped" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still throws on a real failure even when a signal is supplied", async () => {
    // Stopping the watch must not mask a transfer that genuinely failed.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk({ status: "failed" })));
    const controller = new AbortController();

    await expect(
      pollTransferStatus("t1", 600000, controller.signal)
    ).rejects.toThrow(/failed/);
  });

  it("still settles normally when a signal is supplied but never fired", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonOk({ status: "finalized", transactionHash: "0xok" }))
    );
    const controller = new AbortController();

    await expect(
      pollTransferStatus("t1", 600000, controller.signal)
    ).resolves.toMatchObject({ status: "finalized", transactionHash: "0xok" });
  });
});

describe("bridgeToArc", () => {
  type SignTypedData = (typedData: unknown) => Promise<string>;
  let sign: Mock<SignTypedData>;

  beforeEach(() => {
    sign = vi.fn<SignTypedData>().mockResolvedValue("0xsignature");
    // randomBytes32 reaches for window.crypto, which node does not provide.
    vi.stubGlobal("window", {
      crypto: {
        getRandomValues: (a: Uint8Array) => {
          a.fill(7);
          return a;
        },
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const wireUp = () => {
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        String(url).includes("/estimate")
          ? estimate()
          : jsonOk({ transferId: "tr_123" })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  const sentSpec = (fetchMock: ReturnType<typeof vi.fn>, call = 0) =>
    JSON.parse(String(fetchMock.mock.calls[call][1].body))[0].spec;

  it("returns the transfer id the API issued", async () => {
    wireUp();
    await expect(bridgeToArc(WALLET, sign, "baseSepolia", 10)).resolves.toEqual({
      transferId: "tr_123",
      success: true,
    });
  });

  it("estimates first, then submits", async () => {
    const fetchMock = wireUp();
    await bridgeToArc(WALLET, sign, "baseSepolia", 10);

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain("/estimate");
    expect(urls[1]).toContain("/transfer");
  });

  it("sends from the chosen chain to Arc", async () => {
    const fetchMock = wireUp();
    await bridgeToArc(WALLET, sign, "baseSepolia", 10);

    const spec = sentSpec(fetchMock);
    expect(spec.sourceDomain).toBe(chainConfig.baseSepolia.domainId);
    expect(spec.destinationDomain).toBe(chainConfig.arc.domainId);
  });

  it("uses whichever source chain it was handed", async () => {
    const fetchMock = wireUp();
    await bridgeToArc(WALLET, sign, "ethereumSepolia", 10);

    expect(sentSpec(fetchMock).sourceDomain).toBe(chainConfig.ethereumSepolia.domainId);
  });

  it("encodes the amount at 6 decimals", async () => {
    const fetchMock = wireUp();
    await bridgeToArc(WALLET, sign, "baseSepolia", 12.5);

    expect(sentSpec(fetchMock).value).toBe(parseUnits("12.5", 6).toString());
  });

  it("pads the Gateway contracts to 32 bytes", async () => {
    const fetchMock = wireUp();
    await bridgeToArc(WALLET, sign, "baseSepolia", 1);

    const spec = sentSpec(fetchMock);
    expect(spec.sourceContract).toBe(padded(GATEWAY_WALLET_ADDRESS));
    expect(spec.destinationContract).toBe(padded(GATEWAY_MINTER_ADDRESS));
  });

  it("sends the funds back to the same wallet that signed", async () => {
    const fetchMock = wireUp();
    await bridgeToArc(WALLET, sign, "baseSepolia", 1);

    const spec = sentSpec(fetchMock);
    expect(spec.sourceDepositor).toBe(padded(WALLET));
    expect(spec.destinationRecipient).toBe(padded(WALLET));
  });

  it("asks the wallet to sign a BurnIntent", async () => {
    wireUp();
    await bridgeToArc(WALLET, sign, "baseSepolia", 1);

    expect(sign).toHaveBeenCalledTimes(1);
    const typedData = sign.mock.calls[0][0] as {
      primaryType: string;
      domain: { name: string };
    };
    expect(typedData.primaryType).toBe("BurnIntent");
    expect(typedData.domain.name).toBe("GatewayWallet");
  });

  it("submits the signature it was given", async () => {
    const fetchMock = wireUp();
    await bridgeToArc(WALLET, sign, "baseSepolia", 1);

    const submitted = JSON.parse(String(fetchMock.mock.calls[1][1].body))[0];
    expect(submitted.signature).toBe("0xsignature");
  });

  it("reports progress as it goes", async () => {
    wireUp();
    const steps: string[] = [];
    await bridgeToArc(WALLET, sign, "baseSepolia", 1, (m) => steps.push(m));
    expect(steps.length).toBeGreaterThanOrEqual(3);
  });

  it("throws when the estimate call fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(httpFail(500)));
    await expect(bridgeToArc(WALLET, sign, "baseSepolia", 1)).rejects.toThrow(
      /Estimate error/
    );
  });

  it("does not ask for a signature if the estimate failed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(httpFail(500)));
    await expect(bridgeToArc(WALLET, sign, "baseSepolia", 1)).rejects.toThrow();
    expect(sign).not.toHaveBeenCalled();
  });

  it("throws when the estimate comes back without a burn intent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk({ body: [] })));
    await expect(bridgeToArc(WALLET, sign, "baseSepolia", 1)).rejects.toThrow(
      "Missing estimate"
    );
  });

  it("throws when submitting the transfer fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(() => Promise.resolve(estimate()))
        .mockImplementationOnce(() => Promise.resolve(httpFail(400)))
    );
    await expect(bridgeToArc(WALLET, sign, "baseSepolia", 1)).rejects.toThrow(
      /Gateway API error/
    );
  });

  it("throws when the API accepts the transfer but returns no id", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(() => Promise.resolve(estimate()))
        .mockImplementationOnce(() => Promise.resolve(jsonOk({})))
    );
    await expect(bridgeToArc(WALLET, sign, "baseSepolia", 1)).rejects.toThrow(
      "Missing transfer ID"
    );
  });
});
