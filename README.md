# مكتوب

**من السجلات إلى الديسكتوب**

Windows desktop contract-management product for Iraqi offices, developed by NAS CodeWorks.

## V1 product boundary
- Arabic-first RTL desktop application.
- Local-first operation with SQLite.
- Internet required for first activation only.
- One-device license.
- Property, vehicle and general sale contracts.
- Per-license custom contract packs.
- Search, payments, A4 PDF/print, backup and restore.

## Development policy
`develop` is the development source of truth.

Do not push code after failed lint/typecheck/build.

## Bootstrap
```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

## Implemented through 0.5
- Atomic contract CRUD with automatic numbering.
- Local SQLite storage for contracts, parties and payments.
- Search and operational dashboard totals.
- A4 PDF export with payment summary.
- Verified backup and restore flow.
- Secure preload bridge with narrow IPC handlers.
- Node database tests and GitHub Actions quality gates.
- Editable contract-template library with a safe default template.
- Immutable clause snapshots stored with each contract.
- Template clauses included in contract details and A4 PDF output.
- Persistent office identity settings for branded PDF headers and footers.
- Offline Ed25519 license verification bound to one device fingerprint.
- License activation screen and signed-license import.
- Separate key-generation and license-issuer tools; private keys are excluded from Git.

## License authority

Generate a key pair only in a secure directory outside the repository. Ship only the generated public key as `resources/license-public.pem`.

```bash
npm run license:keygen -- /secure/maktoob-license-authority
```

Issue a license after receiving the device ID from the activation screen:

```bash
npm run license:issue -- --private-key /secure/maktoob-license-authority/maktoob-license-private.pem --device MK-0000-0000-0000-0000-0000-0000 --customer "Office name" --out customer.license.json
```

Never commit, upload, email, or bundle `maktoob-license-private.pem` with the application.

## Windows package
```bash
npm run package:win
```

The repository must pass typecheck, lint, tests and build before a development checkpoint.
