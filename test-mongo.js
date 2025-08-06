require("dotenv").config();
const mongoose = require("mongoose");

console.log("🔍 MongoDB Connection Debug Test");
console.log("==================================");
console.log("MONGO_URI exists:", !!process.env.MONGO_URI);
console.log(
  "MONGO_URI starts with mongodb+srv://",
  process.env.MONGO_URI?.startsWith("mongodb+srv://")
);

// Show the current connection string (without credentials)
const currentUri = process.env.MONGO_URI;
if (currentUri) {
  const parts = currentUri.split("@");
  if (parts.length > 1) {
    console.log("Current format:", `mongodb+srv://***:***@${parts[1]}`);
  }
}

console.log("\n📋 Testing different connection options...");

// Test 1: Basic connection
console.log("\n1️⃣ Testing basic connection...");
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // 5 second timeout
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("✅ Basic connection successful!");
    return mongoose.connection.close();
  })
  .catch((err) => {
    console.log("❌ Basic connection failed:");
    console.log("Error message:", err.message);
    console.log("Error code:", err.code);

    // Test 2: Connection without database name
    console.log("\n2️⃣ Testing connection without database name...");
    const uriWithoutDB = process.env.MONGO_URI.replace("/pmt?", "?");
    console.log("Testing URI:", uriWithoutDB.replace(/\/\/.*@/, "//***:***@"));

    return mongoose.connect(uriWithoutDB, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  })
  .then(() => {
    console.log("✅ Connection without database name successful!");
    return mongoose.connection.close();
  })
  .catch((err) => {
    console.log("❌ Connection without database name failed:");
    console.log("Error message:", err.message);
    console.log("Error code:", err.code);

    // Test 3: Check if it's a network issue
    console.log("\n3️⃣ Testing network connectivity...");
    console.log("This might be a network/firewall issue.");
    console.log("Please check:");
    console.log("- MongoDB Atlas cluster status");
    console.log("- IP whitelist (should include 162.240.157.183/32)");
    console.log("- Cluster name: pmt.48ymply.mongodb.net");
    console.log("- Username: PMT");

    process.exit(1);
  });
