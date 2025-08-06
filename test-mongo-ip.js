require("dotenv").config();
const mongoose = require("mongoose");

console.log("🔍 Testing MongoDB connection with IP addresses...");

// Try connecting using IP addresses instead of domain names
const ipBasedUri = process.env.MONGO_URI.replace(
  "pmt.48ymply.mongodb.net",
  "3.64.163.50:27017"
);

console.log("Testing IP-based connection...");
console.log("Modified URI:", ipBasedUri.replace(/\/\/.*@/, "//***:***@"));

mongoose
  .connect(ipBasedUri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("✅ IP-based connection successful!");
    mongoose.connection.close();
  })
  .catch((err) => {
    console.log("❌ IP-based connection failed:");
    console.log("Error:", err.message);

    console.log("\n🔧 DNS Resolution Issue Detected!");
    console.log("Your server cannot resolve the MongoDB Atlas domain name.");
    console.log("\nPossible solutions:");
    console.log("1. Check your server's DNS configuration");
    console.log("2. Contact your hosting provider about DNS issues");
    console.log("3. Try setting Google DNS (8.8.8.8, 8.8.4.4)");
    console.log("4. Check if there are any firewall rules blocking DNS");

    process.exit(1);
  });
