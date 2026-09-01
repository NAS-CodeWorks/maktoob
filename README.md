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
npm install
npm run lint
npm run typecheck
npm run build
```

The repository must pass all three gates before the first development checkpoint.
