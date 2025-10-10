import express from 'express';
import 'dotenv/config'
import cors from 'cors';
import cookieParser from 'cookie-parser';
// import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Import modules
import authRoutes from './routes/auth.js';
import { connect, disconnect } from './routes/db/mongo/mongoose.js';
import mongoRoutes from './routes/db/mongo/apis.js';
import figmaRoutes from './routes/figma.js';


// Initialize Server Express App
const server = express();

// Security middleware
server.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Rate limiting - TEMPORARILY DISABLED
/*
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 auth requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
*/

server.use(express.json({ limit: '10mb' }));
// server.use(generalLimiter); // TEMPORARILY DISABLED

const port = 8000;

// Configure CORS with enhanced security
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.BAI_API_URL + ':' + process.env.BAI_UI_PORT,
            'http://localhost:3000', // Development frontend
            'https://localhost:3000'  // HTTPS development
        ];
        
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    credentials: true,
    maxAge: 86400 // 24 hours
}
server.use(cors(corsOptions));

// Configure Cookies
server.use(cookieParser())

// Routes setup with rate limiting for auth endpoints - TEMPORARILY DISABLED
server.use(`${process.env.BAI_API_BASE_VERSION}/auth`, /* authLimiter, */ authRoutes);
server.use(`${process.env.BAI_API_BASE_VERSION}/figma`, figmaRoutes);

async function startServer() {
    try {
        // Try to connect to MongoDB, but allow server to start even if it fails
        try {
            const database = await connect();
            server.locals.db = database;
            server.use(`${process.env.BAI_API_BASE_VERSION}/db/mongo`, mongoRoutes);
        } catch (dbError) {
            console.error('MongoDB connection failed - starting without database');
            server.locals.db = null;
        }

        server.listen(process.env.BAI_API_PORT, () => {
            console.log(`Server started on port ${process.env.BAI_API_PORT}`);
        })

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log("SIGINT signal: closing HTTP and DB connections");
            if (server.locals.db) await disconnect();
            process.exit(0);
        })

        process.on('SIGTERM', async () => {
            console.log('SIGTERM signal received: closing HTTP and DB connections');
            if (server.locals.db) await disconnect();
            process.exit(0);
        })
    }
    catch (error) {
        console.log("Failed to start server", error);
        process.exit(1);
    }
}

startServer();