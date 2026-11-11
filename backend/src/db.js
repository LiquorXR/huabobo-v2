const mongoose = require('mongoose');
const config = require('./config');

async function connectDb() {
  mongoose.set('strictQuery', true);
  mongoose.set('bufferCommands', false);
  await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    socketTimeoutMS: 20000
  });
  console.log('[db] MongoDB 已连接');
}

function isDbReady() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDb, isDbReady };
