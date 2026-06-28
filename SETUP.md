# Email Verifier Platform - Setup Guide

## Prerequisites

- Node.js 16+ and npm

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

**Edit `.env`**:
```
PORT=5000
NODE_ENV=development
```

**Start the backend**:
```bash
npm run dev
```

The API will be running at `http://localhost:5000`

### 2. Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
cp .env.example .env
```

**Edit `.env`**:
```
VITE_API_URL=http://localhost:5000
```

**Start the frontend**:
```bash
npm run dev
```

The UI will open at `http://localhost:5173`

## Project Structure

```
Email-Verifier/
├── backend/
│   ├── src/
│   │   ├── index.js                 # Express server entry
│   │   ├── middleware/
│   │   │   ├── auth.js              # API key validation
│   │   │   └── errorHandler.js      # Global error handler
│   │   ├── routes/
│   │   │   └── verify.js            # Email verification endpoints
│   │   ├── services/
│   │   │   └── emailVerifier.js     # Core verification logic
│   │   └── utils/
│   │       └── fileUtils.js         # File handling utilities
│   ├── uploads/                     # Temp CSV upload storage
│   ├── downloads/                   # Generated CSV storage
│   ├── package.json
│   ├── .env.example
│   └── .env                         # (create from .env.example)
│
├── frontend/
│   ├── src/
│   │   ├── index.jsx                # React entry point
│   │   ├── App.jsx                  # Main app component
│   │   ├── index.css                # Tailwind CSS
│   │   ├── api/
│   │   │   └── emailService.js      # API client
│   │   └── components/
│   │       ├── StatusBadge.jsx      # Status display
│   │       ├── SingleVerification.jsx   # Single email form
│   │       └── BulkVerification.jsx    # CSV upload/process
│   ├── index.html                   # HTML entry
│   ├── vite.config.js               # Vite configuration
│   ├── tailwind.config.js           # Tailwind config
│   ├── postcss.config.js            # PostCSS config
│   ├── package.json
│   ├── .env.example
│   └── .env                         # (create from .env.example)
│
├── README.md                        # Project overview
├── SETUP.md                         # This file
└── .gitignore                       # Git ignore rules
```

## How to Use

### Single Email Verification

1. Enter an email in the "Single Verification" section
2. Click "Verify"
3. Results show:
   - **Green badge**: Valid email
   - **Red badge**: Invalid email
   - **Yellow badge**: Catch-all address
4. Details show syntax, MX records, and SMTP checks

### Bulk Verification

1. Prepare a CSV file with an `email` column
2. Drag & drop the file or click to select
3. Click "Verify All"
4. Wait for processing
5. Download the results CSV with verification status

**CSV Format**:
```
email,name,phone
test@example.com,John Doe,555-1234
user@company.com,Jane Smith,555-5678
```

**Output CSV includes**:
- email: The verified email
- status: `valid`, `invalid`, or `catch-all`
- syntax_valid: `Yes` or `No`
- mx_records: `Yes` or `No`
- smtp_ok: `Yes` or `No`

## API Endpoints

### Check Health

```bash
curl http://localhost:5000/health
```

### Verify Single Email

```bash
curl -X POST http://localhost:5000/api/verify-single \
  -H "X-API-Key: your-secret-api-key-change-me" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Verify CSV

```bash
curl -X POST http://localhost:5000/api/verify-csv \
  -H "X-API-Key: your-secret-api-key-change-me" \
  -F "file=@emails.csv"
```

## Development

### Backend Development

- **Auto-reload**: `npm run dev` watches files with `--watch`
- **Production**: `npm start`
- **Debug**: Add `console.log()` statements; they appear in the terminal

### Frontend Development

- **Hot Module Reload**: Changes auto-refresh in browser
- **Build**: `npm run build` creates `dist/` folder
- **Preview**: `npm run preview` runs production build locally

## Troubleshooting

### "API Key MISSING" error
- Ensure `.env` file exists in the backend folder
- Verify `API_KEY=` is set
- Restart backend: `npm run dev`

### CORS errors in browser console
- Frontend and backend API keys must match
- Ensure `VITE_API_URL` in frontend `.env` is correct
- Default is `http://localhost:5000`

### CSV uploads fail
- Ensure file is valid CSV format
- Max file size: 10MB
- Must have an `email` column

### Emails verify as "catch-all"
- Server exists but doesn't validate individual addresses
- Common with corporate email providers

## Security Notes

- **Single Static API Key**: This platform uses one shared API key
- **Environment Variables**: Never commit `.env` files
- **File Cleanup**: Uploaded CSVs are deleted after processing
- **CORS**: Configured for localhost development

For production deployment, consider:
- Using OAuth or JWT tokens instead of static API key
- Running behind a reverse proxy (nginx, caddy)
- Enabling HTTPS
- Implementing rate limiting
- Adding logging and monitoring

## Support

For issues or questions, check:
1. Terminal output for error messages
2. Browser console for frontend errors
3. Verify `.env` files match across backend and frontend
