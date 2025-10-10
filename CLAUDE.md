# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Start Development Server:**
```bash
node server.js
# OR with nodemon for auto-restart during development
npx nodemon server.js
```

**Package Management:**
```bash
npm install        # Install dependencies
npm test          # Run tests (currently defaults to npm test)
```

## Architecture Overview

This is a Node.js Express backend for Blueprint AI, a design-to-code conversion platform that integrates with Figma.

**Core Structure:**
- `server.js` - Main Express application with CORS, MongoDB connection, and graceful shutdown
- `routes/auth.js` - Figma OAuth2 authentication flow with JWT token management
- `routes/figma.js` - Figma API integration for file access and tree structure extraction
- `routes/db/mongo/` - MongoDB integration layer

**Key Features:**
- Figma OAuth2 authentication with access/refresh token storage
- JWT-based session management using httpOnly cookies
- MongoDB user and component storage via Mongoose
- CORS configured for frontend communication
- Graceful server shutdown handling

**Database Models:**
- **User**: Stores Figma user data, tokens, and authentication info
- **Component**: Links users to specific Figma components with generated/modified code

**Environment Variables Required:**
- `BAI_API_URL`, `BAI_UI_PORT` - Frontend URL configuration
- `BAI_API_BASE_VERSION`, `BAI_API_PORT` - API versioning and port
- `BAI_FIGMA_CLIENT_ID`, `BAI_FIGMA_CLIENT_SECRET` - Figma OAuth credentials
- `BAI_FIGMA_REDIRECT_URI`, `BAI_FIGMA_STATE` - OAuth flow configuration
- `BAI_JWT_SECRET` - JWT signing secret
- `BAI_MONGODB_USERNAME`, `BAI_MONGODB_PASSWORD` - MongoDB Atlas credentials
- `BAI_BAI_MONGODB_DATABASE` - MongoDB database name

**Authentication Flow:**
1. `/auth/figma/login` redirects to Figma OAuth
2. `/auth/figma/callback` handles OAuth callback, exchanges code for tokens
3. User data stored in MongoDB, JWT set as httpOnly cookie
4. Protected routes use JWT middleware for authentication

**API Endpoints:**
- `GET /auth/figma/login` - Initiate Figma OAuth flow
- `GET /auth/figma/callback` - Handle OAuth callback
- `GET /auth/me` - Get current authenticated user
- `GET /figma/file/:fileKey` - Fetch Figma file structure (requires auth)
