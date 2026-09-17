import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const envLocal = fs.readFileSync(path.resolve(".env.local"), "utf8");
for (const line of envLocal.split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

const uri = process.env.MONGODB_URI;
console.log("Connecting with URI:", uri ? uri.replace(/:([^@]+)@/, ":***@") : "MISSING");

async function main() {
  if (!uri) {
    console.error("MONGODB_URI is not set!");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB!");

  const db = mongoose.connection.db;
  if (!db) {
    console.error("DB connection object missing");
    process.exit(1);
  }

  const collections = await db.listCollections().toArray();
  console.log("Existing collections:", collections.map(c => c.name));

  // Check SuperAdmin
  const superadmins = await db.collection("superadmins").find({}).toArray();
  console.log("\n--- SuperAdmins --- count:", superadmins.length);
  for (const sa of superadmins) {
    console.log("ID:", sa._id, "Email:", sa.email, "Name:", sa.name);
    const match = await bcrypt.compare("superadminpassword", sa.password || "");
    console.log("  Matches 'superadminpassword':", match);
  }

  // Ensure admin@travelcompany.com exists with correct password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash("superadminpassword", salt);

  const existingSuperAdmin = await db.collection("superadmins").findOne({
    email: "admin@travelcompany.com",
  });

  if (!existingSuperAdmin) {
    console.log("\nCreating admin@travelcompany.com in superadmins collection...");
    const res = await db.collection("superadmins").insertOne({
      name: "System Super Admin",
      email: "admin@travelcompany.com",
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Inserted SuperAdmin id:", res.insertedId);
  } else {
    console.log("\nUpdating password for existing admin@travelcompany.com...");
    await db.collection("superadmins").updateOne(
      { _id: existingSuperAdmin._id },
      {
        $set: {
          name: "System Super Admin",
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }
    );
    console.log("Updated existing SuperAdmin password.");
  }

  // Also remove admin@travelcompany.com from users collection so it never conflicts
  const deletedUsers = await db.collection("users").deleteMany({ email: "admin@travelcompany.com" });
  if (deletedUsers.deletedCount > 0) {
    console.log(`\nRemoved ${deletedUsers.deletedCount} conflicting record(s) from users collection.`);
  }

  // Verify tenants
  const tenants = await db.collection("tenants").find({}).toArray();
  console.log("\n--- Tenants --- count:", tenants.length);
  for (const t of tenants) {
    console.log("Tenant:", t.name, "slug:", t.slug, "ID:", t._id);
  }

  await mongoose.disconnect();
  console.log("\nDone!");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
