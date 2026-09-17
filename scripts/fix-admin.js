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
    
    // 1. Get the ceylon tenant
    const ceylonTenant = await db.collection("tenants").findOne({ slug: "ceylon" });
    if (!ceylonTenant) {
      console.error("❌ Tenant 'ceylon' not found. Cannot proceed.");
      process.exit(1);
    }
    console.log(`✓ Found ceylon tenant (ID: ${ceylonTenant._id})`);

    const bcrypt = require("bcryptjs");
    
    // 2. Find admin@ceylon.com
    const email = "admin@ceylon.com";
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      console.log(`❌ User '${email}' not found. Creating it...`);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("password123", salt);
      
      await db.collection("users").insertOne({
        name: "Ceylon Admin",
        email: email,
        password: hashedPassword,
        provider: "credentials",
        role: "tenant_admin",
        status: "active",
        tenantId: ceylonTenant._id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✓ Created user '${email}' under 'ceylon' tenant.`);
    } else {
      console.log(`✓ Found user '${email}' (Current tenantId: ${user.tenantId})`);
      
      // Update the user to belong to the ceylon tenant
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("password123", salt);

      await db.collection("users").updateOne(
        { _id: user._id },
        { $set: { tenantId: ceylonTenant._id, role: "tenant_admin", password: hashedPassword } }
      );
      
      console.log(`✓ Successfully updated user '${email}' to belong to 'ceylon' tenant.`);
    }

  } catch (err) {
    console.error("Script failed with error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
