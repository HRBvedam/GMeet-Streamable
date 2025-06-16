import cron from "node-cron";
import { uploadNewVideos } from "../api/services/uploadService.js";

// Run every 10 minutes
cron.schedule("*/10 * * * *", async () => {
  console.log("Checking for new videos...");

  try {
    const result = await uploadNewVideos();
    console.log("Cron job completed:", result.message || result);
  } catch (error) {
    console.error("Cron job failed:", error.message);
  }
});

console.log("Video upload scheduler started. Checking every 10 minutes...");
