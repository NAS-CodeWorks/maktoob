# مكتوب

**من السجلات إلى الديسكتوب**

Windows desktop contract-management product for Iraqi offices, developed by NAS CodeWorks.

## V1 Product Capabilities
- **Arabic-first RTL desktop application** designed for Windows 10/11 64-bit.
- **Local-first offline operation** powered by SQLite in WAL mode; no external cloud dependency.
- **Device-bound offline licensing** using cryptographic Ed25519 signatures (1 License = 1 Device). No internet connection required for activation.
- **Structured contract categories**:
  - General sale contracts (`بيع عام`)
  - Real estate and land contracts (`بيع عقار`) with plot, district, area, governorate, and location details
  - Vehicle contracts (`بيع مركبة`) with make, model, year, color, chassis/VIN, and plate number
  - Rental, pledge, and clearance contracts
- **Contract templates and immutable snapshots**:
  - Operational template library with specialized templates for real estate and vehicle sales
  - Immutable clause snapshots stored per contract to protect historical wording from template edits
- **Party registry and customer management**:
  - Party auto-population and quick-fill from past office records
  - Shared party records preserved when deleting individual contracts
- **Financial tracking and payments**:
  - Split tracking in Iraqi Dinar (IQD) and US Dollar (USD)
  - Payment records, balance recalculation, and overpayment prevention
- **Document generation and printing**:
  - Formal A4 documents with office branding headers and footers
  - Export to PDF and direct printing to Windows physical printers via native dialog
- **Data safety and migrations**:
  - Deterministic SQLite migrations tracked in `schema_migrations`
  - Automated backup creation and integrity-verified restoration (`PRAGMA integrity_check`)
  - Corrupt or invalid backup restore protection

## Development Source of Truth
`develop` is the development source of truth.

Do not commit or push code unless all quality gates pass:
```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Bootstrap
```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

## Windows Packaging
```bash
# Package into unpacked directory
npm run package:dir

# Build production NSIS installer (Maktoob-1.0.0-x64.exe)
npm run package:win
```

## License Authority & Production Rules

- **Cryptographic Engine**: Maktoob licenses use Ed25519 digital signatures.
- **Public Key**: `resources/license-public.pem` is the only bundled authority key and is safe for public distribution.
- **Private Key Authority**: The matching private key (`maktoob-license-private.pem`) must remain strictly outside the repository in a secure directory (e.g., `%USERPROFILE%\Documents\NAS CodeWorks Secure\Maktoob License Authority`).
- **Single Authority**: The private key is the root licensing authority for all issued installations.
- **Key Recovery & Rotation**:
  - Losing the private key permanently prevents issuing new licenses compatible with the current public key.
  - Rotating the signing key requires rebuilding and redistributing Maktoob with the newly matching public key.
- **Absolute Invariant**: Never commit, upload, email, package, or distribute private signing material.

### Key Generation
```bash
npm run license:keygen -- "C:\Users\<user>\Documents\NAS CodeWorks Secure\Maktoob License Authority"
```

### Issuing a Customer License
Issue a device-bound license after receiving the hardware fingerprint from the office activation screen:
```bash
npm run license:issue -- --private-key "C:\Users\<user>\Documents\NAS CodeWorks Secure\Maktoob License Authority\maktoob-license-private.pem" --device MK-0000-0000-0000-0000-0000-0000 --customer "اسم المكتب" --out customer.license.json
```
