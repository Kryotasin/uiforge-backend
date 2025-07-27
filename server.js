import express from 'express';
import 'dotenv/config'
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Import modules
import authRoutes from './routes/auth.js';
import { connect, disconnect } from './routes/db/mongo/mongoose.js';
import mongoRoutes from './routes/db/mongo/apis.js';
import figmaRoutes from './routes/figma.js';


// Initialize Server Express App
const server = express();
server.use(express.json());

const port = 8000;

// Configure CORS
const corsOptions = {
    origin: process.env.BAI_API_URL,
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204
}
server.use(cors(corsOptions));

// Configure Cookies
server.use(cookieParser())

// Routes setup
server.use(`${process.env.BAI_API_BASE_VERSION}/auth`, authRoutes);
server.use(`${process.env.BAI_API_BASE_VERSION}/figma`, figmaRoutes);

async function startServer() {
    try {
        const database = await connect();
        server.locals.db = database;


        server.use(`${process.env.BAI_API_BASE_VERSION}/db/mongo`, mongoRoutes);
        server.listen(process.env.BAI_API_PORT, () => {
            console.log('Started server...');
        })

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log("SIGINT signal: closing HTTP and DB connections");
            await disconnect();
            process.exit(0);
        })

        process.on('SIGTERM', async () => {
            console.log('SIGTERM signal received: closing HTTP and DB connections');
            await disconnect();
            process.exit(0);
        })
    }
    catch (error) {
        console.log("Failed to start server, db connection error", error);
        process.exit(1);
    }
}

startServer();