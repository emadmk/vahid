const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB متصل شد: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ خطا در اتصال به MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
