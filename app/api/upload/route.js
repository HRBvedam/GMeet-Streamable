/**
 * Alternative App Router API Route using native FormData
 * Place this file at: /app/api/upload/route.js
 * This approach works better with App Router
 */

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { writeFile } from "fs/promises";
import request from "request";

class ToStreamable {
  constructor(opts = {}) {
    this.opts = opts;
    this.shortcode = null;
  }

  upload(cb = () => {}) {
    const { file, auth, params = [] } = this.opts;

    if (!file) return cb(new Error("No file specified"));
    if (!auth) return cb(new Error("No auth specified"));

    const paramString = params.length > 0 ? `?${params.join("&")}` : "";

    const req = request(
      {
        method: "POST",
        url: `https://api.streamable.com/upload${paramString}`,
        formData: { file },
        json: true,
        auth,
      },
      (err, res, body) => {
        if (err) return cb(err);
        if (!body || !body.shortcode) {
          return cb(new Error("Invalid response from Streamable"));
        }

        const { shortcode } = body;
        this.shortcode = shortcode;
        return cb(null, body);
      }
    );

    return req;
  }

  status(cb = () => {}) {
    const { auth } = this.opts;
    const shortcode = this.shortcode;

    if (!shortcode) return cb(new Error("No shortcode, upload file first"));

    const req = request(
      {
        method: "GET",
        url: `https://api.streamable.com/videos/${shortcode}`,
        json: true,
        auth,
      },
      (err, res, body) => cb(err, body)
    );

    return req;
  }
}

// Helper function to save uploaded file temporarily
async function saveUploadedFile(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Create temp directory if it doesn't exist
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Generate unique filename
  const timestamp = Date.now();
  const originalName = file.name || "video";
  const fileName = `${timestamp}-${originalName}`;
  const filePath = path.join(tempDir, fileName);

  // Write file to temp directory
  await writeFile(filePath, buffer);

  return filePath;
}

// Named export for POST method (required for App Router)
export async function POST(request) {
  try {
    console.log("POST request received");

    // Parse form data using native FormData API
    const formData = await request.formData();

    const username = formData.get("username");
    const password = formData.get("password");
    const file = formData.get("file");

    console.log("Username:", username);
    console.log("File:", file?.name, file?.size);

    // Validate required fields
    if (!username || !password || !file) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: username, password, and file are required",
        },
        { status: 400 }
      );
    }

    // Validate file size (500MB limit)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 500MB." },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "video/mp4",
      "video/avi",
      "video/mov",
      "video/wmv",
      "video/flv",
      "video/webm",
    ];
    if (
      !allowedTypes.includes(file.type) &&
      !file.name.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i)
    ) {
      return NextResponse.json(
        {
          error:
            "Please upload a valid video file (MP4, AVI, MOV, WMV, FLV, WebM).",
        },
        { status: 400 }
      );
    }

    // Save uploaded file temporarily
    const tempFilePath = await saveUploadedFile(file);
    console.log("Temp file saved:", tempFilePath);

    // Create read stream for the uploaded file
    const stream = fs.createReadStream(tempFilePath);

    // Create ToStreamable instance
    const upload = new ToStreamable({
      file: stream,
      auth: {
        username: username.toString(),
        password: password.toString(),
      },
      params: [],
    });

    // Return a promise that resolves when upload is complete
    return new Promise((resolve) => {
      upload.upload((err, body) => {
        if (err) {
          console.error("Upload error:", err);
          // Clean up temp file on error
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
          } catch (cleanupErr) {
            console.error("Error cleaning up temp file:", cleanupErr);
          }

          resolve(
            NextResponse.json(
              { error: "Streamable upload failed: " + err.message },
              { status: 500 }
            )
          );
          return;
        }

        if (!body || !upload.shortcode) {
          // Clean up temp file on error
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
          } catch (cleanupErr) {
            console.error("Error cleaning up temp file:", cleanupErr);
          }

          resolve(
            NextResponse.json(
              { error: "Upload failed: No shortcode received" },
              { status: 500 }
            )
          );
          return;
        }

        console.log("Upload successful, shortcode:", upload.shortcode);

        // Poll for processing status
        let pollCount = 0;
        const maxPolls = 60; // Maximum 60 seconds of polling

        const poll = setInterval(() => {
          pollCount++;

          if (pollCount > maxPolls) {
            clearInterval(poll);
            // Clean up temp file
            try {
              if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
              }
            } catch (cleanupErr) {
              console.error("Error cleaning up temp file:", cleanupErr);
            }

            resolve(
              NextResponse.json(
                { error: "Processing timeout - video may still be processing" },
                { status: 500 }
              )
            );
            return;
          }

          upload.status((err, statusBody) => {
            if (err) {
              console.error("Status check error:", err);
              clearInterval(poll);

              // Clean up temp file
              try {
                if (fs.existsSync(tempFilePath)) {
                  fs.unlinkSync(tempFilePath);
                }
              } catch (cleanupErr) {
                console.error("Error cleaning up temp file:", cleanupErr);
              }

              resolve(
                NextResponse.json(
                  { error: "Error checking processing status" },
                  { status: 500 }
                )
              );
              return;
            }

            console.log("Status check:", statusBody);

            // Status 2 = processed successfully
            if (statusBody.status === 2) {
              clearInterval(poll);

              // Clean up temp file
              setTimeout(() => {
                try {
                  if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                  }
                } catch (cleanupErr) {
                  console.error("Error cleaning up temp file:", cleanupErr);
                }
              }, 1000);

              resolve(
                NextResponse.json({
                  url: `https://streamable.com/${upload.shortcode}`,
                  shortcode: upload.shortcode,
                })
              );
            }
            // Status 3 = processing failed
            else if (statusBody.status === 3) {
              clearInterval(poll);

              // Clean up temp file
              try {
                if (fs.existsSync(tempFilePath)) {
                  fs.unlinkSync(tempFilePath);
                }
              } catch (cleanupErr) {
                console.error("Error cleaning up temp file:", cleanupErr);
              }

              resolve(
                NextResponse.json(
                  { error: statusBody.message || "Video processing failed" },
                  { status: 500 }
                )
              );
            }
            // Status 0 or 1 = still processing, continue polling
          });
        }, 1000);
      });
    });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}

// Export GET method to handle unsupported requests
export async function GET() {
  return NextResponse.json(
    { error: "GET method not supported. Use POST to upload videos." },
    { status: 405 }
  );
}

// Add support for other methods with proper error messages
export async function PUT() {
  return NextResponse.json(
    { error: "PUT method not supported. Use POST to upload videos." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "DELETE method not supported. Use POST to upload videos." },
    { status: 405 }
  );
}
