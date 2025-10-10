import mongoose from 'mongoose';
const { ServerApiVersion } = mongoose;

const uri = `mongodb+srv://${process.env.BAI_MONGODB_USERNAME}:${process.env.BAI_MONGODB_PASSWORD}@cluster0.emwtwiv.mongodb.net/${process.env.BAI_BAI_MONGODB_DATABASE}?retryWrites=true&w=majority`;

async function connect() {

    if (mongoose.connection.readyState === 1) {
        console.log('Connection exists');
        return mongoose.connection;
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000, // 10 second timeout
            maxPoolSize: 10,
            minPoolSize: 5,
            // serverApi: {
            //     version: ServerApiVersion.V1,
            //     strict: true,
            //     deprecationErrors: true,
            // },
        });

        console.log('Mongoose connected')
        return mongoose.connection;
    }
    catch (error) {
        console.error('MongoDB:', error.message);
        throw error;
    }
}

async function disconnect() {
    if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3 || mongoose.connection.readyState === 99) {
        await mongoose.close();
        console.log("Connection closed");
    }
}

export { connect, disconnect };