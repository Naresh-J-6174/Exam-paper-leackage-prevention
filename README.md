# Ledger Paper — Blockchain-Secured Exam Paper Distribution System

## Description

Ledger Paper is a full-stack web application that prevents exam question-paper
leakage by combining encrypted cloud storage with blockchain-based tamper
detection. Every uploaded question paper is encrypted and stored privately in
the cloud, while a cryptographic fingerprint (hash) of that file is written
to a public blockchain. Before a paper is ever released for an exam, the
system re-computes the file's fingerprint and compares it against the
immutable on-chain record — if even a single byte of the file has changed,
the mismatch is detected automatically and release is blocked. The system
supports three roles — Admin, Teacher, and Invigilator — each with their own
dashboard and permissions, plus a full audit log of every action taken.

## Demo Links: https://drive.google.com/file/d/17Z1JzJm_AQrceUItn7-dpoApl1C7zpOD/view?usp=sharing
##vercel link :: https://exam-paper-leackage-prevention-20.vercel.app/
- **Google Drive (project files / documentation):** 
- **Video demonstration:**
  - for teacher use teacher@gmail.com and pasword : welcome
  - for invigilator use invigilator@gmail.com and password : welcome
## Technologies / Tools Used

**Frontend**
- Next.js 14 (React 18, App Router)
- Tailwind CSS
- TypeScript

**Backend**
- Next.js API Routes (Node.js runtime)
- Node.js `crypto` module — AES-256-GCM file encryption and SHA-256 hashing
- ethers.js — communication with the smart contract

**Blockchain**
- Solidity 0.8.24 (smart contract: `ExamPaperRegistry.sol`)
- Hardhat (compiling and deploying the contract)
- Polygon Amoy Testnet (public test blockchain)
- MetaMask (test wallet used to deploy the contract and sign transactions)

**Database & Storage**
- Supabase (PostgreSQL database + file Storage bucket + Authentication)
- Row-Level Security (RLS) policies for role-based data access

**Deployment**
- Git & GitHub (version control)
- Vercel (hosting the live web application)
## Steps to Install Dependencies and Run the Project

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 2. Set up Supabase/cloude
1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run the entire contents of `supabase/schema.sql`.
3. From Project Settings → API, copy the Project URL, `anon` key, and
   `service_role` key.

### 3. Deploy the smart contract
```bash
cd blockchain
npm install
```
Copy `blockchain/.env.example` to `blockchain/.env` and fill in a test
wallet's private key (`DEPLOYER_PRIVATE_KEY`) and an RPC URL for Polygon
Amoy. Get free test tokens from a Polygon Amoy faucet, then deploy:
```bash
npm run deploy:amoy
```
Copy the printed contract address.

### 4. Configure and run the web app
```bash
cd ..
```
Copy `.env.example` to `.env.local` and fill in:
- Supabase URL, anon key, and service role key
- The blockchain RPC URL, the same private key used to deploy, and the
  deployed contract address
- A generated file-encryption key:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

Install and run:
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in a browser.

### 5. Create the first admin account
Sign up through the app's login page, then in the Supabase SQL Editor run:
```sql
update profiles set role = 'admin' where id = 'your-user-uuid-from-auth.users';
```

## Project Structure / Modules and Their Purpose

```
exam-paper-blockchain/
├── blockchain/                     Smart contract project (separate from the web app)
│   ├── contracts/ExamPaperRegistry.sol   The on-chain registry: stores each paper's
│   │                                      hash, release time, and role permissions
│   └── scripts/deploy.js                 Deploys the contract to Polygon Amoy
│
├── app/                             Next.js web application (deployed to Vercel)
│   ├── login/                            Sign in / sign up page
│   ├── dashboard/admin/                  Admin dashboard: assign roles, revoke/delete papers
│   ├── dashboard/teacher/                Teacher dashboard: upload question papers
│   ├── dashboard/invigilator/            Invigilator dashboard: verify and release papers
│   └── api/
│       ├── upload/                       Encrypts a file, stores it, seals its hash on-chain
│       ├── verify/                       Re-hashes a stored file and checks it against the chain
│       ├── release/                      Re-verifies, then unlocks a paper for download
│       ├── revoke/                       Admin-only: permanently flags a paper as compromised
│       └── papers/                       Lists papers; per-paper download and delete endpoints
│
├── lib/
│   ├── crypto.ts                         AES-256-GCM encryption/decryption, SHA-256 hashing
│   ├── blockchain.ts                     ethers.js functions that call the smart contract
│   ├── supabaseClient.ts                 Browser-side Supabase client
│   └── supabaseServer.ts                 Server-side Supabase client(s)
│
├── components/
│   ├── UploadForm.tsx                    Paper upload form (teacher dashboard)
│   ├── PapersTable.tsx                   Shared table showing all papers with role-based actions
│   └── DashboardShell.tsx                Shared page header/sign-out for all dashboards
│
├── middleware.ts                    Protects dashboard routes and enforces role-based access
├── supabase/schema.sql              Database tables, security policies, and storage bucket setup
└── README.md                        This file
```

## Sample Input and Output

**Sample input (Teacher dashboard — upload form):**
| Field | Example value |
|---|---|
| Exam code | `23CS103` |
| Title | `Data Structures — Midterm` |
| Release at | `2026-09-15 20:54` |
| Question paper file | `midterm.pdf` |

**Sample output (after clicking "Encrypt, upload & seal on-chain"):**
```
Paper encrypted, stored, and sealed on-chain.
Chain transaction hash: 0x585063CbdD7776bBA729c684900F5C0544644C3A...
```
The paper then appears in the ledger with a status badge of **SEALED** and
its SHA-256 fingerprint displayed.

**Sample output (Invigilator dashboard — "Verify hash"):**
```
Fingerprint matches the on-chain seal. The file is intact.
```
If the stored file had been altered in any way, the output instead reads:
```
MISMATCH — the stored file does not match its on-chain seal. Do not release it.
```

**Sample output (Invigilator dashboard — "Verify & release", after release time has passed):**
```
Paper verified and released.
```
The status badge changes to **RELEASED** and a **Download** button appears.

---


