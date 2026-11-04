# Image Upload & Validation System

A full-stack image upload system with AI-powered face detection, blur detection, similarity checking, and comprehensive validation rules.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React + Vite)                      │
│  • Drag-and-drop upload zone   • Real-time status polling             │
│  • Image previews               • Accepted / Rejected sections        │
│  • Client-side format checks   • Upload progress bars                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ REST API
┌──────────────────────────────▼──────────────────────────────────────┐
│                     BACKEND (Node.js + Express)                       │
│                                                                       │
│  POST /api/images/upload  ──►  multer  ──►  DB (PENDING)             │
│                                             ↓                         │
│                                        Queue Job                      │
│                                             ↓                         │
│                                     processImage()                    │
│                                    (HEIC → JPEG)                      │
│                                             ↓                         │
│                                 ValidationService                     │
│                        ┌────────────────────────────┐                 │
│                        │ 1. Format check             │                 │
│                        │ 2. Size / Resolution        │                 │
│                        │ 3. Blur (Laplacian)         │                 │
│                        │ 4. Face detection (TF.js)   │                 │
│                        │ 5. Similarity (dHash)       │                 │
│                        └────────────────────────────┘                 │
│                                             ↓                         │
│                              ACCEPTED → S3/Local → DB update          │
│                              REJECTED → DB update (reason)            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
        ┌──────────────────────┴─────────────┐
        │                                    │
   PostgreSQL                           AWS S3 / Local
   (Prisma ORM)                         Storage
```

## Validation Rules

| Rule | Threshold | Rejection Code |
|------|-----------|----------------|
| File format | JPEG, PNG, HEIC only | `FORMAT_INVALID` |
| File size | Min 10KB | `FILE_TOO_SMALL` |
| Resolution | Min 200×200px | `RESOLUTION_TOO_LOW` |
| Blur | Laplacian variance < 100 | `IMAGE_TOO_BLURRY` |
| No face | 0 faces detected | `NO_FACE_DETECTED` |
| Multiple faces | >1 face detected | `MULTIPLE_FACES` |
| Face too small | Face area < 5% of image | `FACE_TOO_SMALL` |
| Duplicate | dHash Hamming distance ≤ 10 | `TOO_SIMILAR_TO_EXISTING` |

## Quick Start

### 1. Prerequisites
- Node.js ≥ 18
- Docker (for local PostgreSQL) OR a PostgreSQL instance

### 2. Start PostgreSQL
```bash
docker-compose up -d
```

### 3. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL

# Run database migrations
npm run db:migrate

# (Optional) Download face detection models — enables face rules
npm run download-models

# Start dev server
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

## Environment Variables (Backend)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `STORAGE_MODE` | `local` | `local` or `s3` |
| `AWS_ACCESS_KEY_ID` | — | Required when STORAGE_MODE=s3 |
| `AWS_SECRET_ACCESS_KEY` | — | Required when STORAGE_MODE=s3 |
| `AWS_REGION` | `us-east-1` | AWS region |
| `AWS_S3_BUCKET` | — | S3 bucket name |
| `AWS_ENDPOINT_URL` | — | Override for MinIO / Localstack |
| `MIN_FILE_SIZE_BYTES` | `10240` | 10KB |
| `MAX_FILE_SIZE_BYTES` | `10485760` | 10MB |
| `MIN_DIMENSION_PX` | `200` | Min width/height |
| `BLUR_THRESHOLD` | `100` | Laplacian variance threshold |
| `FACE_MIN_AREA_RATIO` | `0.05` | Face must cover ≥5% of image |
| `SIMILARITY_HASH_DISTANCE` | `10` | Max Hamming distance (0–64) |
| `CORS_ORIGIN` | `http://localhost:5173` | Frontend origin |

## Face Detection Setup

Face validation requires model files (~12MB total):

```bash
cd backend
npm run download-models
```

This downloads the SSD MobileNet v1 model from the vladmandic/face-api repository.

**If models are absent**, the server starts normally but logs a warning. Format, blur, resolution, and similarity checks still run — only face-related rules are skipped.

**System dependencies** for `@tensorflow/tfjs-node`:
- macOS: no extra steps (uses pre-built binaries)
- Ubuntu/Debian: `apt-get install libc6`

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/images/upload` | Upload image (`multipart/form-data`, field: `image`) |
| `GET` | `/api/images` | List images (`?status=ACCEPTED&page=1&limit=20`) |
| `GET` | `/api/images/stats` | Queue/status counts |
| `GET` | `/api/images/:id` | Get single image with status |
| `DELETE` | `/api/images/:id` | Delete image |
| `GET` | `/health` | Health check |

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Storage | AWS S3 (local filesystem fallback) |
| Image Processing | sharp (HEIC→JPEG, thumbnails, metadata) |
| Face Detection | @vladmandic/face-api + @tensorflow/tfjs-node |
| Blur Detection | Laplacian variance (custom, using sharp raw pixels) |
| Similarity | Difference Hash (dHash) + Hamming distance |
| Logging | Winston |
| Security | Helmet + CORS + Rate limiting |
