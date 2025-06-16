import fs from "fs";
import path from "path";
import "dotenv/config";
import { ToStreamable } from "./toStreamable.js";


const dirPath = path.join(process.cwd(), "downloads");
const stateFilePath = path.join(process.cwd(), "uploadedVideos.json");

// Initialize state file
function initStateFile() {
  if (!fs.existsSync(stateFilePath)) {
    fs.writeFileSync(stateFilePath, JSON.stringify([]));
  }
}

// Get uploaded files from state
function getUploadedFiles() {
  try {
    const data = fs.readFileSync(stateFilePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading state file:", error);
    return [];
  }
}

// Add file to uploaded state
function markAsUploaded(filename) {
  try {
    const uploaded = getUploadedFiles();
    if (!uploaded.includes(filename)) {
      uploaded.push(filename);
      fs.writeFileSync(stateFilePath, JSON.stringify(uploaded, null, 2));
    }
  } catch (error) {
    console.error("Error updating state file:", error);
  }
}

// Get new video files
function getNewVideoFiles() {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      return [];
    }

    const allFiles = fs.readdirSync(dirPath);
    const uploaded = getUploadedFiles();

    return allFiles.filter((file) => {
      const ext = file.split(".").pop().toLowerCase();
      const isVideo = ["mp4", "avi", "mov", "wmv", "flv", "webm"].includes(ext);
      return isVideo && !uploaded.includes(file);
    });
  } catch (error) {
    console.error("Error getting new videos:", error);
    return [];
  }
}

// Upload video to Streamable
export async function uploadNewVideos() {
  initStateFile();
  const newVideos = getNewVideoFiles();

  if (newVideos.length === 0) {
    console.log("No new videos to upload");
    return { success: true, message: "No new videos found" };
  }

  const credentials = {
    username: process.env.STREAMABLE_USERNAME,
    password: process.env.STREAMABLE_PASSWORD,
  };
  console.log(credentials.username, credentials.password);

  if (!credentials.username || !credentials.password) {
    throw new Error("Streamable credentials missing in environment variables");
  }
    

  console.log(`Found ${newVideos.length} new video(s) to upload`);

  for (const videoFile of newVideos) {
    try {
      const filePath = path.join(dirPath, videoFile);
      const stream = fs.createReadStream(filePath);

      console.log(`Uploading: ${videoFile}`);

      const upload = new ToStreamable({
        file: stream,
        auth: {
          username: credentials.username,
          password: credentials.password,
        },
        params: [],
      });

      // Wrap callback in promise
      await new Promise((resolve, reject) => {
        upload.upload((err, body) => {
          if (err) return reject(err);
          if (!body || !upload.shortcode) {
            return reject(new Error("No shortcode received"));
          }
          resolve(body);
        });
      });

      console.log(
        `Upload successful for ${videoFile}, shortcode: ${upload.shortcode}`
      );

      // Poll for processing status
      let processed = false;
      for (let i = 0; i < 60 && !processed; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await new Promise((resolve, reject) => {
          upload.status((err, statusBody) => {
            if (err) return reject(err);

            if (statusBody.status === 2) {
              processed = true;
              markAsUploaded(videoFile);
              console.log(`Processing complete for ${videoFile}`);
            } else if (statusBody.status === 3) {
              reject(
                new Error(
                  `Processing failed for ${videoFile}: ${statusBody.message}`
                )
              );
            }
            resolve();
          });
        });
      }

      if (!processed) {
        throw new Error(`Processing timeout for ${videoFile}`);
      }
    } catch (error) {
      console.error(`Error uploading ${videoFile}:`, error.message);
      // Continue with next file even if one fails
    }
  }

  return { success: true, uploaded: newVideos.length };
}
