const mongoose = require('mongoose');
require('dotenv').config();

let mongoReady = false;

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI && process.env.NODE_ENV === 'production') {
    throw new Error('MONGO_URI is required in production; refusing to use the local JSON fallback.');
  }

  try {
    await mongoose.connect(mongoURI || 'mongodb://127.0.0.1:27017/school_management', {
      serverSelectionTimeoutMS: 3000,
      autoIndex: true
    });

    mongoReady = true;
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    mongoReady = false;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`MongoDB connection is required in production: ${error.message}`);
    }
    console.warn('MongoDB connection failed, continuing with local JSON fallback:', error.message);
    return false;
  }
};

const isMongoReady = () => mongoReady || mongoose.connection.readyState === 1;

module.exports = {
  connectDB,
  isMongoReady
};
