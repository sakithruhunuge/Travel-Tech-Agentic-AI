import mongoose from "mongoose";
import Tenant from "../src/models/Tenant";
import * as fs from "fs";
import * as path from "path";

// Read .env file manually to avoid dotenv dependency
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

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/travel-company";

  if (!MONGODB_URI) {
    console.error("Error: MONGODB_URI environment variable is not defined.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB database successfully.");

    const slug = "ceylon";
    let existingTenant = await Tenant.findOne({ slug });

    if (existingTenant) {
      console.log(`✓ Tenant "ceylon" already exists (ID: ${existingTenant._id}). Updating status to active...`);
      existingTenant.status = "active";
      existingTenant.name = "Ceylon Travel";
      await existingTenant.save();
      console.log(`✓ Tenant "ceylon" activated successfully.`);
    } else {
      const tenant = await Tenant.create({
        name: "Ceylon Travel",
        slug: slug,
        plan: "premium",
        status: "active",
        isolation: "shared",
        branding: {
          primaryColor: "#00a650",
          secondaryColor: "#ff9900",
          tagline: "Experience the Wonder of Asia",
        },
      });
      console.log(`✓ Provisioned "ceylon" tenant space: "${tenant.name}" (ID: ${tenant._id})`);
    }

  } catch (err) {
    console.error("Migration script failed with error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
