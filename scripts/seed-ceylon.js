const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/travel-company";

async function run() {
  if (!MONGODB_URI) {
    console.error("Error: MONGODB_URI environment variable is not defined.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB database successfully.");

    const db = mongoose.connection.db;
    const tenantsCollection = db.collection("tenants");
    
    const slug = "ceylon";
    const existingTenant = await tenantsCollection.findOne({ slug });

    if (existingTenant) {
      console.log(`✓ Tenant "ceylon" already exists (ID: ${existingTenant._id}). Updating status to active...`);
      await tenantsCollection.updateOne({ slug }, { $set: { status: "active", name: "Ceylon Travel" } });
      console.log(`✓ Tenant "ceylon" activated successfully.`);
    } else {
      console.log("Tenant not found.");
    }
  } catch (err) {
    console.error("Script failed with error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
