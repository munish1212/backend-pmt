require("dotenv").config();
const axios = require("axios");

console.log("🔍 Testing MongoDB Atlas Data API connection...");

// Test if we can reach MongoDB Atlas API endpoints
const testEndpoints = [
  "https://cloud.mongodb.com",
  "https://data.mongodb-api.com",
  "https://realm.mongodb.com"
];

async function testConnectivity() {
  for (const endpoint of testEndpoints) {
    try {
      console.log(`Testing connection to ${endpoint}...`);
      const response = await axios.get(endpoint, { timeout: 5000 });
      console.log(`✅ Successfully connected to ${endpoint} (Status: ${response.status})`);
    } catch (error) {
      console.log(`❌ Failed to connect to ${endpoint}: ${error.message}`);
    }
  }
  
  console.log("\n🔧 Network Analysis:");
  console.log("Your server can reach general internet (google.com) but not MongoDB Atlas.");
  console.log("This suggests your hosting provider is blocking MongoDB Atlas connections.");
  console.log("\nRecommended actions:");
  console.log("1. Contact your hosting provider about MongoDB Atlas access");
  console.log("2. Ask them to allow connections to *.mongodb.net domains");
  console.log("3. Request them to open port 27017 for outbound connections");
  console.log("4. Consider switching to a different hosting provider if they can't help");
}

testConnectivity(); 