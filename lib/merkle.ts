import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'

export interface MerkleEntry {
  address: string
  amount: string
}

export function createMerkleTree(entries: MerkleEntry[]) {
  // Create leaves matching the contract's leaf encoding
  const leaves = entries.map((entry) => {
    return keccak256(
      Buffer.concat([
        Buffer.from(entry.address.toLowerCase().slice(2).padStart(64, '0'), 'hex'),
        Buffer.from(BigInt(entry.amount).toString(16).padStart(64, '0'), 'hex')
      ])
    )
  })

  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
  
  return tree
}

export function getMerkleRoot(tree: MerkleTree): string {
  return '0x' + tree.getRoot().toString('hex')
}

export function getMerkleProof(tree: MerkleTree, address: string, amount: string): string[] {
  const leaf = keccak256(
    Buffer.concat([
      Buffer.from(address.toLowerCase().slice(2).padStart(64, '0'), 'hex'),
      Buffer.from(BigInt(amount).toString(16).padStart(64, '0'), 'hex')
    ])
  )
  
  const proof = tree.getProof(leaf)
  
  return proof.map((p) => '0x' + p.data.toString('hex'))
}
