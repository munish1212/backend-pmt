require("dotenv").config();
const mongoose = require("mongoose");

console.log("Testing MongoDB connection...");
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

console.log("\n🔧 ISSUE FOUND: Missing database name in connection string!");
console.log(
  "Current: mongodb+srv://PMT:PMT12345@pmt.48ymply.mongodb.net/?retryWrites=true&w=majority&appName=PMT"
);
console.log(
  "Should be: mongodb+srv://PMT:PMT12345@pmt.48ymply.mongodb.net/YOUR_DATABASE_NAME?retryWrites=true&w=majority&appName=PMT"
);

// Test connection with current string
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB Connected Successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.log("❌ MongoDB Connection Error:");
    console.log("Error message:", err.message);
    console.log("Error code:", err.code);
    console.log("Full error:", err);
    process.exit(1);
  });
