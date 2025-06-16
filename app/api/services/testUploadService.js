import "dotenv/config";
import { uploadNewVideos } from "./uploadService.js";

async function testUpload() {
  try {
    console.log("Starting upload test...");
    const result = await uploadNewVideos();
    console.log("Upload test result:", result);
    if (result.success) {
      console.log("✅ Upload service is working correctly.");
    } else {
      console.error("❌ Upload service did not complete successfully.");
    }
  } catch (error) {
    console.error("❌ Error during upload test:", error);
  }
}

testUpload();
