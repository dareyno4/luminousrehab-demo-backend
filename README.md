# LR Backend API

Express/Node.js backend server for the Luminous Rehab application.

## Features

- User activation endpoints
- Tenant activation
- Supabase integration
- CORS enabled for frontend

## Environment Variables

Required environment variables:

```env
PORT=8080
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NODE_ENV=production
```

## API Endpoints

### Health Check

```
GET /api/health
Returns: {"ok": true}
```

### Activate Tenant

```
POST /api/activate-tenant
Body: {
  tenantSubdomain: string
  activationCode: string
  email: string
  password: string
  firstName: string
  lastName: string
}
```

### Activate User

```
POST /api/activate-user
Body: {
  activationCode: string
  password: string
  additionalData: object (optional)
}
```

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm install
npm run build
npm start
```

## Deployment

See [BACKEND-DEPLOYMENT.md](../BACKEND-DEPLOYMENT.md) for detailed deployment instructions.

## Tech Stack

- Node.js
- Express 5
- TypeScript
- Supabase JS Client
- CORS
- dotenv
