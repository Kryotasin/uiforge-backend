import mongoose from 'mongoose';
const { ServerApiVersion } = mongoose;

const uri = `mongodb+srv://${process.env.BAI_MONGODB_USERNAME}:${process.env.BAI_MONGODB_PASSWORD}@cluster0.jio8mfu.mongodb.net`;

async function connect() {

    if (mongoose.connection.readyState === 1) {
        console.log('Connection exists');
        return mongoose.connection;
    }

    try {
        await mongoose.connect(uri, {
            // serverApi: {
            //     version: ServerApiVersion.V1,
            //     strict: true,
            //     deprecationErrors: true,
            // },
            db: process.env.BAI_BAI_MONGODB_DATABASE,
        });

        console.log('Mongoose connected!')
        return mongoose.connection;
    }
    catch (error) {
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