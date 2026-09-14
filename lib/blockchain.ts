import { ethers } from "ethers";
import abi from "./ExamPaperRegistryABI.json";

/**
 * The app holds ONE backend wallet (set via BACKEND_PRIVATE_KEY) that
 * signs every on-chain write. Teachers/invigilators authenticate with
 * normal email/password via Supabase — they never need a crypto wallet
 * themselves. The contract's role checks are enforced against this
 * backend wallet's address; who is allowed to *ask* the backend to act
 * as teacher/invigilator/admin is enforced by Supabase roles in the API
 * route before it ever calls the chain. This keeps the UX simple while
 * still getting the chain's tamper-evidence guarantees.
 */
function getProvider() {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is not set");
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getSigner() {
  const key = process.env.BACKEND_PRIVATE_KEY;
  if (!key) throw new Error("BACKEND_PRIVATE_KEY is not set");
  return new ethers.Wallet(key, getProvider());
}

function getContract(withSigner = false) {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address) throw new Error("CONTRACT_ADDRESS is not set");
  return new ethers.Contract(address, abi, withSigner ? getSigner() : getProvider());
}

export async function registerPaperOnChain(
  examCode: string,
  fileHashHex: string,
  releaseAtUnix: number
): Promise<{ key: string; txHash: string }> {
  const contract = getContract(true);
  const tx = await contract.registerPaper(examCode, fileHashHex, releaseAtUnix);
  const receipt = await tx.wait();

  // Pull the emitted key out of the PaperRegistered event.
  const event = receipt.logs
    .map((log: any) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e: any) => e && e.name === "PaperRegistered");

  return { key: event.args.key, txHash: receipt.hash };
}

export async function verifyPaperOnChain(key: string, recomputedHashHex: string): Promise<boolean> {
  const contract = getContract(true); // verifyPaper emits an event, so it's a write call
  const tx = await contract.verifyPaper(key, recomputedHashHex);
  const receipt = await tx.wait();
  const event = receipt.logs
    .map((log: any) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e: any) => e && e.name === "PaperVerified");
  return Boolean(event?.args.matched);
}

export async function releasePaperOnChain(key: string): Promise<string> {
  const contract = getContract(true);
  const tx = await contract.releasePaper(key);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function revokePaperOnChain(key: string, reason: string): Promise<string> {
  const contract = getContract(true);
  const tx = await contract.revokePaper(key, reason);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function getPaperFromChain(key: string) {
  const contract = getContract(false);
  return contract.getPaper(key);
}
