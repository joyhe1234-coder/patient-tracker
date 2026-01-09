# Patient Quality Measure Tracking System

A web-based application for tracking patient quality measures in medical offices.

## Quick Start

### Prerequisites

- Node.js 20 LTS
- Docker Desktop
- npm or yarn

### Development Setup

1. **Clone and install dependencies:**

```bash
cd patient-tracker

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

2. **Start the database:**

```bash
cd ..
docker compose up -d db
```

3. **Set up the database:**

```bash
cd backend

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed the database
npm run db:seed
```

4. **Start the development servers:**

In terminal 1 (backend):
```bash
cd backend
npm run dev
```

In terminal 2 (frontend):
```bash
cd frontend
npm run dev
```

5. **Access the application:**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Health check: http://localhost:3000/api/health

### Production Deployment

```bash
# Build and start all containers
docker compose up -d --build

# Access at http://localhost
```

## Project Structure

```
patient-tracker/
├── backend/           # Express.js API server
│   ├── src/           # TypeScript source files
│   └── prisma/        # Database schema and migrations
├── frontend/          # React frontend with AG Grid
│   └── src/           # React components
├── config/            # Configuration files (mounted as volume)
├── nginx/             # Nginx reverse proxy config
└── docker-compose.yml # Docker orchestration
```

## API Endpoints

### Health
- `GET /api/health` - Health check

### Data (Grid)
- `GET /api/data` - Get all patient measures
- `POST /api/data` - Create new row
- `PUT /api/data/:id` - Update row
- `DELETE /api/data/:id` - Delete row

### Configuration
- `GET /api/config/all` - Get all configuration data
- `GET /api/config/request-types` - Get request types
- `GET /api/config/quality-measures/:requestTypeCode` - Get quality measures
- `GET /api/config/measure-statuses/:qualityMeasureCode` - Get measure statuses

## Development

### Database Commands

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Create a new migration
npm run db:migrate

# Deploy migrations (production)
npm run db:migrate:deploy

# Seed the database
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio
```

## License

Private - Internal Use Only
