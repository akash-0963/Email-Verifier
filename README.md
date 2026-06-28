# Email Verifier - Free Public Tool

**No API keys. No limits. Just email verification.**

A completely free email verification platform that anyone can use instantly.

## Quick Start

### 1. Setup (Choose One)

**Windows:**
```bash
QUICKSTART.bat
```

**macOS/Linux:**
```bash
bash QUICKSTART.sh
```

### 2. Run

**Terminal 1:**
```bash
cd backend && npm run dev
```

**Terminal 2:**
```bash
cd frontend && npm run dev
```

### 3. Open Browser

```
http://localhost:5173
```

Done! No configuration needed.

## Features

✨ **Single Email Verification**
- Real-time validation
- Syntax, MX record, and SMTP checks
- Instant results

📦 **Bulk CSV Processing**
- Upload CSV files (up to 10MB)
- Verify thousands of emails at once
- Download results CSV

🎨 **Simple UI**
- Drag-and-drop upload
- Color-coded status badges
- Zero learning curve

🚀 **100% Free**
- No API keys required
- No authentication
- No tracking

## API

### Single Email
```bash
curl -X POST http://localhost:5000/api/verify-single \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Response:**
```json
{
  "email": "test@example.com",
  "status": "valid",
  "checks": {
    "syntax": true,
    "mxRecords": true,
    "smtp": true
  }
}
```

### Bulk CSV
```bash
curl -X POST http://localhost:5000/api/verify-csv \
  -F "file=@emails.csv"
```

**Response:**
```json
{
  "downloadUrl": "/downloads/verified_1234567890.csv",
  "totalRows": 100,
  "validCount": 85,
  "invalidCount": 10,
  "catchAllCount": 5
}
```

## Status Meanings

- 🟢 **Valid** - Email works
- 🔴 **Invalid** - Email doesn't exist
- 🟡 **Catch-all** - Server accepts all emails

## Tech Stack

- **Backend**: Express.js, Node.js, DNS, Multer, csv-parser
- **Frontend**: React 18, Vite, Tailwind CSS
- **Verification**: DNS MX lookups, SMTP testing

## Directory Structure

```
Email-Verifier/
├── backend/          # Node.js API
│   └── src/
│       ├── index.js
│       ├── routes/       # API endpoints
│       ├── services/     # Email verification
│       └── middleware/   # Error handling
├── frontend/         # React UI
│   └── src/
│       ├── App.jsx
│       ├── components/   # UI components
│       └── api/          # API client
├── README.md         # This file
├── SETUP.md          # Detailed setup
├── PUBLIC_TOOL.md    # Deployment guide
└── .gitignore
```

## Requirements

- Node.js 16+
- npm

## Configuration

**backend/.env:**
```
PORT=5000
NODE_ENV=development
```

**frontend/.env:**
```
VITE_API_URL=http://localhost:5000
```

## Use Cases

✅ Clean mailing lists
✅ Validate user signups
✅ Verify email imports
✅ Test email addresses
✅ Quality assurance

## Deployment

See `PUBLIC_TOOL.md` for deployment to cloud services (Heroku, Railway, Docker, etc).

## Documentation

- `SETUP.md` - Detailed setup & troubleshooting
- `PUBLIC_TOOL.md` - Deployment & integration
- `SUMMARY_PUBLIC.txt` - Features overview

## License

MIT - Free for personal and commercial use
