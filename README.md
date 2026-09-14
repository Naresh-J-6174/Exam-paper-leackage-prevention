# Ledger Paper — Blockchain-Secured Exam Paper Distribution

Prevents question-paper leakage by combining:

- **Encrypted cloud storage** (Supabase Storage) — papers are AES-256-GCM
  encrypted before they're ever uploaded.
- **A blockchain seal** (a Solidity smart contract on a public testnet) —
  the SHA-256 fingerprint of every uploaded file is written on-chain and
  can never be changed or quietly deleted afterward.
- **Verify-before-release** — an invigilator can only unlock a paper after
  the app re-hashes the stored file and confirms it still matches the
  on-chain seal. Any tampering (a leaked, edited, or swapped file) is
  caught automatically and release is blocked.

## How it prevents leakage

| Step | What happens |
|---|---|
| 1. Teacher uploads | File is encrypted server-side, then stored in a private Supabase bucket. |
| 2. Seal is written | SHA-256 hash of the encrypted file + exam code + release time is sent to `registerPaper()` on the smart contract. |
| 3. Time-lock | The contract refuses to let anyone call `releasePaper()` before the scheduled release time. |
| 4. Verify | Anyone can call `verifyPaper()` to re-check a file's hash against the immutable on-chain record — this is how tampering is detected. |
| 5. Release | Invigilator triggers release; the app re-verifies automatically first and blocks release on any mismatch. |
| 6. Revoke | If leakage is suspected, an admin can revoke a paper, which permanently blocks release/download even if someone tries to bypass the UI. |
| 7. Audit trail | Every verify/release/download/revoke is logged with who did it and when (`access_log` table). |

## Project layout

```
exam-paper-blockchain/
├── blockchain/            # Hardhat project — the smart contract (deployed separately, NOT on Vercel)
│   ├── contracts/ExamPaperRegistry.sol
│   └── scripts/deploy.js
├── app/                    # Next.js 14 app (this is what deploys to Vercel)
│   ├── login/
│   ├── dashboard/{admin,teacher,invigilator}/
│   └── api/{upload,verify,release,revoke,papers}/
├── lib/                    # crypto.ts, blockchain.ts, supabase clients
├── supabase/schema.sql     # run this once in the Supabase SQL editor
└── middleware.ts           # role-based route protection
```

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the entire contents of `supabase/schema.sql`.
   This creates the `profiles`, `exams`, `papers`, `access_log` tables, RLS
   policies, and a private `exam-papers` storage bucket.
3. From **Project Settings → API**, copy your Project URL, `anon` key, and
   `service_role` key — you'll need them below.
4. The first user who signs up should be manually promoted to `admin`:
   ```sql
   update profiles set role = 'admin' where id = 'the-users-uuid-from-auth.users';
   ```
   After that, use the Admin dashboard's "Assign roles" form for everyone else.

## 2. Deploy the smart contract (one-time)

You need a free testnet wallet and some free test tokens — no real money required.

1. `cd blockchain && npm install`
2. Create a MetaMask (or any) wallet **for testing only** and export its
   private key.
3. Get free test MATIC from the [Polygon Amoy faucet](https://faucet.polygon.technology/).
4. Copy `blockchain/.env.example` to `blockchain/.env` and fill in
   `DEPLOYER_PRIVATE_KEY` (and optionally a dedicated `AMOY_RPC_URL` from
   [Alchemy](https://www.alchemy.com/) for reliability).
5. Deploy:
   ```bash
   npm run deploy:amoy
   ```
6. Copy the printed contract address — you'll set it as `CONTRACT_ADDRESS`
   in the Next.js app's environment variables.

The same wallet's private key becomes the app's `BACKEND_PRIVATE_KEY` — the
app uses this one wallet to sign all on-chain writes, so teachers and
invigilators only ever need an email/password login, not a crypto wallet.

## 3. Configure the Next.js app

1. Copy `.env.example` to `.env.local` in the project root.
2. Fill in the Supabase values from step 1 and the blockchain values from
   step 2.
3. Generate a file-encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Put it in `FILE_ENCRYPTION_KEY`.
4. Install and run locally:
   ```bash
   npm install
   npm run dev
   ```

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: blockchain-secured exam paper system"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

`.env.local` and `blockchain/.env` are already git-ignored — never commit
real keys.

## 5. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repo.
2. Vercel auto-detects Next.js — leave the build settings as default. (The
   `blockchain/` folder is ignored by the Next.js build; it's a separate
   Hardhat project you only run locally/once to deploy the contract.)
3. Under **Environment Variables**, add every variable from your
   `.env.local` (Supabase URL/keys, `RPC_URL`, `BACKEND_PRIVATE_KEY`,
   `CONTRACT_ADDRESS`, `FILE_ENCRYPTION_KEY`).
4. Deploy. Vercel gives you a live URL.

## Security notes for a real deployment

- The demo uses one shared backend wallet to keep the UX simple (no
  MetaMask required for staff). For a production system handling real
  exams, consider giving each role its own wallet and having the frontend
  sign transactions directly, so no single backend key can act as every role.
- Rotate `FILE_ENCRYPTION_KEY` and `BACKEND_PRIVATE_KEY` if either ever
  leaks — old encrypted files won't decrypt with a new key, so keep the
  old key archived securely if you need to read old papers later.
- This is built on public testnets for a free, gas-fee-free demo. For a
  real deployment, evaluate whether a permissioned/private blockchain
  (e.g., Hyperledger Fabric) or a mainnet deployment better fits your
  institution's trust and cost requirements.
