import { encodeFunctionData, parseUnits, getAddress, type Address } from "viem";

export const FORWARDER_ADDRESS = "0x522fAf9A91c41c443c66765030741e4AaCe147D0";

export const forwarderAbi = [
  {
    inputs: [
      {
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "aggregate3",
    outputs: [
      {
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
        name: "returnData",
        type: "tuple[]",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// Build transfer calls (not transferFrom)
export function buildTransferCalls(
  tokenAddress: Address,
  from: Address,   // not actually used in calldata, but we keep for clarity
  recipients: { address: string; amount: string }[],
  decimals: number
) {
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

  return recipients.map(({ address, amount }) => {
    const parsed = parseUnits(amount, decimals);
    const callData = encodeFunctionData({
      abi: transferAbi,
      functionName: "transfer",
      args: [getAddress(address), parsed],
    });
    return {
      target: tokenAddress,
      allowFailure: true,
      callData,
    };
  });
}
