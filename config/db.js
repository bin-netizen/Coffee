const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        console.error("❌ MONGO_URI is missing. Please add it to the .env file.");
        return false;
    }

    try {
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });

        isConnected = true;
        console.log("✅ MongoDB connected");
        return true;
    } catch (error) {
        isConnected = false;
        console.error("❌ MongoDB connection failed.");
        console.error("👉 Common cause: your current IP is not whitelisted in MongoDB Atlas.");
        console.error("👉 Fix: add your public IP to Atlas > Network Access, or correct MONGO_URI.");
        console.error(error.message);
        return false;
    }
}

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.isConnected = () => isConnected;