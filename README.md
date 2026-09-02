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

## Implemented through 0.4
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

## Windows package
```bash
npm run package:win
```

The repository must pass typecheck, lint, tests and build before a development checkpoint.
