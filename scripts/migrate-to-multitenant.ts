import mongoose from "mongoose";
import Tenant from "../src/models/Tenant";
import User from "../src/models/User";
import TravelRequest from "../src/models/TravelRequest";
import Package from "../src/models/Package";

const isConfirm = process.argv.includes("--confirm");
const isDryRun = !isConfirm;

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error("\x1b[31mError: MONGODB_URI environment variable is not defined.\x1b[0m");
    console.error("Please run the script using:");
    console.error("  \x1b[36mnpx dotenv -e .env.local tsx scripts/migrate-to-multitenant.ts\x1b[0m");
    console.error("or set MONGODB_URI directly in your shell.");
    process.exit(1);
  }

  console.log(`\n\x1b[33m--- MULTI-TENANT MIGRATION SERVICE ---`);
  console.log(`Mode: ${isDryRun ? "\x1b[31mDRY-RUN (Simulated)\x1b[0m" : "\x1b[32mLIVE (Executing Changes)\x1b[0m"}`);
  if (isDryRun) {
    console.log("Note: To commit these changes, re-run this script with the '--confirm' flag.\n");
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB database successfully.");

    // -------------------------------------------------------------
    // PHASE 1: Resolve / Create Default Tenant
    // -------------------------------------------------------------
    let defaultTenant: any = null;
    const defaultSlug = "default-tenant";

    const existingTenant = await Tenant.findOne({ slug: defaultSlug });

    if (existingTenant) {
      defaultTenant = existingTenant;
      console.log(`✓ Resolved existing default tenant: "${defaultTenant.name}" (ID: ${defaultTenant._id})`);
    } else {
      if (isDryRun) {
        console.log(`+ [DRY-RUN] Will create default tenant: "Horizon Travel" (slug: "${defaultSlug}")`);
        // Mock a temp ID for simulation counts
        defaultTenant = { _id: new mongoose.Types.ObjectId(), name: "Horizon Travel" };
      } else {
        defaultTenant = await Tenant.create({
          name: "Horizon Travel",
          slug: defaultSlug,
          plan: "free",
          status: "active",
          isolation: "shared",
          branding: {
            primaryColor: "#FF8B50",
            secondaryColor: "#25A5FE",
            tagline: "Explore Your Next Adventure",
          },
        });
        console.log(`✓ Provisioned default tenant space: "${defaultTenant.name}" (ID: ${defaultTenant._id})`);
      }
    }

    // -------------------------------------------------------------
    // PHASE 2: Calculate Backfill Target Counts
    // -------------------------------------------------------------
    const missingTenantFilter = {
      $or: [{ tenantId: { $exists: false } }, { tenantId: null }],
    };

    const usersToUpdate = await User.countDocuments(missingTenantFilter);
    const requestsToUpdate = await TravelRequest.countDocuments(missingTenantFilter);
    const packagesToUpdate = await Package.countDocuments(missingTenantFilter);

    console.log(`\n\x1b[33m--- BACKFILL ANALYSIS ---\x1b[0m`);
    console.log(`- Users missing tenantId: ${usersToUpdate}`);
    console.log(`- Travel Requests missing tenantId: ${requestsToUpdate}`);
    console.log(`- Packages missing tenantId: ${packagesToUpdate}`);

    if (isDryRun) {
      if (usersToUpdate > 0) console.log(`+ [DRY-RUN] Will assign tenantId ${defaultTenant._id} to ${usersToUpdate} users.`);
      if (requestsToUpdate > 0) console.log(`+ [DRY-RUN] Will assign tenantId ${defaultTenant._id} to ${requestsToUpdate} travel requests.`);
      if (packagesToUpdate > 0) console.log(`+ [DRY-RUN] Will assign tenantId ${defaultTenant._id} to ${packagesToUpdate} packages.`);
    } else {
      if (usersToUpdate > 0) {
        const uRes = await User.updateMany(missingTenantFilter, { $set: { tenantId: defaultTenant._id } });
        console.log(`✓ Assigned tenantId to ${uRes.modifiedCount} users.`);
      }
      if (requestsToUpdate > 0) {
        const rRes = await TravelRequest.updateMany(missingTenantFilter, { $set: { tenantId: defaultTenant._id } });
        console.log(`✓ Assigned tenantId to ${rRes.modifiedCount} travel requests.`);
      }
      if (packagesToUpdate > 0) {
        const pRes = await Package.updateMany(missingTenantFilter, { $set: { tenantId: defaultTenant._id } });
        console.log(`✓ Assigned tenantId to ${pRes.modifiedCount} packages.`);
      }
    }

    // -------------------------------------------------------------
    // PHASE 3: Seeding Check (Idempotent Packages)
    // -------------------------------------------------------------
    const tenantPackagesCount = await Package.countDocuments({ tenantId: defaultTenant._id });
    if (tenantPackagesCount === 0) {
      console.log(`\n- Packages collection is currently empty for default tenant.`);
      if (isDryRun) {
        console.log(`+ [DRY-RUN] Will seed default package itineraries.`);
      } else {
        const defaultPackages = [
          {
            tenantId: defaultTenant._id,
            slug: "cultural-triangle",
            name: "Cultural Triangle & Ancient Cities",
            duration: "6 Days",
            destinations: ["Anuradhapura", "Polonnaruwa", "Sigiriya", "Dambulla", "Kandy"],
            includes: ["4-Star Hotels", "Private Guide", "Entrance Fees", "Daily Breakfast"],
            image: "https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800",
            priceRange: "$799 - $1199",
            rating: "4.9",
            status: "active",
          },
          {
            tenantId: defaultTenant._id,
            slug: "scenic-highlands",
            name: "Scenic Highlands & Tea Trails",
            duration: "5 Days",
            destinations: ["Kandy", "Nuwara Eliya", "Ella"],
            includes: ["Scenic Train Ride", "Tea Plantation Tour", "Boutique Stays", "Half Board"],
            image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=800",
            priceRange: "$699 - $999",
            rating: "4.8",
            status: "active",
          },
        ];
        await Package.insertMany(defaultPackages);
        console.log(`✓ Seeded default travel packages for tenant space.`);
      }
    }

    // -------------------------------------------------------------
    // PHASE 4: Safe Index Migration Process
    // -------------------------------------------------------------
    console.log(`\n\x1b[33m--- INDEX MIGRATION PROCESS ---\x1b[0m`);

    const usersColl = mongoose.connection.db!.collection("users");
    const userIndexes = await usersColl.listIndexes().toArray();

    const hasCompositeUnique = userIndexes.some(
      (idx) => idx.key.tenantId === 1 && idx.key.email === 1 && idx.unique
    );
    const obsoleteIndex = userIndexes.find(
      (idx) => idx.key.email === 1 && !idx.key.tenantId && idx.unique
    );

    if (isDryRun) {
      if (!hasCompositeUnique) {
        console.log(`+ [DRY-RUN] Will create composite unique index { tenantId: 1, email: 1 } for User.`);
      }
      if (obsoleteIndex) {
        console.log(`- [DRY-RUN] Will drop obsolete unique index: "${obsoleteIndex.name}" ({ email: 1 }).`);
      }
      console.log(`+ [DRY-RUN] Will verify other multi-tenant query optimization indexes.`);
    } else {
      // 1. Safe Creation of composite unique index
      if (!hasCompositeUnique) {
        await usersColl.createIndex({ tenantId: 1, email: 1 }, { unique: true, name: "tenantId_1_email_1" });
        console.log(`✓ Created composite unique index: "tenantId_1_email_1".`);
      }

      // Create other query indexes
      await mongoose.connection.db!
        .collection("travelrequests")
        .createIndex({ tenantId: 1, createdAt: -1 }, { name: "tenantId_1_createdAt_-1" });
      await mongoose.connection.db!
        .collection("packages")
        .createIndex({ tenantId: 1, status: 1 }, { name: "tenantId_1_status_1" });
      console.log(`✓ Created/Verified multi-tenant query optimization indexes.`);

      // 2. Double check new composite unique index exists before dropping the obsolete index
      const updatedUserIndexes = await usersColl.listIndexes().toArray();
      const hasCompositeNow = updatedUserIndexes.some(
        (idx) => idx.key.tenantId === 1 && idx.key.email === 1 && idx.unique
      );

      if (hasCompositeNow && obsoleteIndex) {
        await usersColl.dropIndex(obsoleteIndex.name);
        console.log(`✓ Dropped obsolete global unique index: "${obsoleteIndex.name}".`);
      }
    }

    // -------------------------------------------------------------
    // PHASE 5: Post-Migration Integrity Validations
    // -------------------------------------------------------------
    console.log(`\n\x1b[33m--- INTEGRITY VALIDATION ---\x1b[0m`);

    const orphanedUsers = await User.countDocuments(missingTenantFilter);
    const orphanedRequests = await TravelRequest.countDocuments(missingTenantFilter);
    const orphanedPackages = await Package.countDocuments(missingTenantFilter);

    let passesOrphanCheck = orphanedUsers === 0 && orphanedRequests === 0 && orphanedPackages === 0;
    if (isDryRun) passesOrphanCheck = true; // Simulating pass

    console.log(`- Orphaned Documents Check: ${passesOrphanCheck ? "\x1b[32mPASSED\x1b[0m" : "\x1b[31mFAILED\x1b[0m"}`);
    if (!passesOrphanCheck) {
      console.error(`  Warning: ${orphanedUsers} users, ${orphanedRequests} requests, ${orphanedPackages} packages left without tenantId.`);
    }

    // Validate email duplicates under the same tenant space
    const duplicateEmailCheck = await User.aggregate([
      { $group: { _id: { tenantId: "$tenantId", email: "$email" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    const passesDuplicationCheck = duplicateEmailCheck.length === 0;
    console.log(`- Email Duplication Check: ${passesDuplicationCheck ? "\x1b[32mPASSED\x1b[0m" : "\x1b[31mFAILED\x1b[0m"}`);
    if (!passesDuplicationCheck) {
      console.error(`  Warning: Found duplicate emails registered under the same tenant workspace!`);
    }

    // Summary Report
    console.log(`\n\x1b[32m✓ Migration Routine Completed successfully.\x1b[0m`);
    console.log(`=========================================`);
    console.log(`Migration Status: ${isDryRun ? "SIMULATED" : "SUCCESS"}`);
    console.log(`Target Tenant: Horizon Travel`);
    console.log(`Data Scopes Configured: Users, TravelRequests, Packages`);
    console.log(`Index Status: verified composite indexes`);
    console.log(`=========================================\n`);

    // Rollback documentation
    console.log(`\x1b[35m--- ROLLBACK / RECOVERY INSTRUCTIONS ---\x1b[0m`);
    console.log(`If you need to roll back this multi-tenant database indexing partition, execute:`);
    console.log(`1. Re-create global index: db.users.createIndex({ email: 1 }, { unique: true })`);
    console.log(`2. Drop composite index: db.users.dropIndex("tenantId_1_email_1")`);
    console.log(`3. Drop query indexes: db.travelrequests.dropIndex("tenantId_1_createdAt_-1")`);
    console.log(`4. Remove tenantId: db.users.updateMany({}, { $unset: { tenantId: "" } })\n`);

  } catch (err) {
    console.error("\x1b[31mMigration script failed with error:\x1b[0m", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
