/**
 * Alternative App Router API Route using native FormData
 * Place this file at: /app/api/upload/route.js
 * This approach works better with App Router
 */

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { writeFile } from "fs/promises";
import { ToStreamable } from "../services/toStreamable.js"; // Adjust path as needed

async function saveUploadedFile(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Create temp directory if it doesn't exist
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const timestamp = Date.now();
  const originalName = file.name || "video";
  const fileName = `${timestamp}-${originalName}`;
  const filePath = path.join(tempDir, fileName);

  await writeFile(filePath, buffer);

  return filePath;
}

export async function POST(request) {
  try {
    console.log("POST request received");

    const formData = await request.formData();

    const username = formData.get("username");
    const password = formData.get("password");
    const file = formData.get("file");

    console.log("Username:", username);
    console.log("File:", file?.name, file?.size);

    if (!username || !password || !file) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: username, password, and file are required",
        },
        { status: 400 }
      );
    }

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 500MB." },
        { status: 400 }
      );
    }

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

    const tempFilePath = await saveUploadedFile(file);
    console.log("Temp file saved:", tempFilePath);

    const stream = fs.createReadStream(tempFilePath);

    const upload = new ToStreamable({
      file: stream,
      auth: {
        username: username.toString(),
        password: password.toString(),
      },
      params: [],
    });

    return new Promise((resolve) => {
      upload.upload((err, body) => {
        if (err || !body || !upload.shortcode) {
          try {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
          } catch {}
          resolve(
            NextResponse.json(
              {
                error:
                  "Streamable upload failed: " +
                  (err?.message || "No shortcode received"),
              },
              { status: 500 }
            )
          );
          return;
        }

        let pollCount = 0;
        const maxPolls = 60;

        const poll = setInterval(() => {
          pollCount++;
          if (pollCount > maxPolls) {
            clearInterval(poll);
            try {
              if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            } catch {}
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
              clearInterval(poll);
              try {
                if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
              } catch {}
              resolve(
                NextResponse.json(
                  { error: "Error checking processing status" },
                  { status: 500 }
                )
              );
              return;
            }

            if (statusBody.status === 2) {
              clearInterval(poll);
              setTimeout(() => {
                try {
                  if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
                } catch {}
              }, 1000);
              resolve(
                NextResponse.json({
                  url: `https://streamable.com/${upload.shortcode}`,
                  shortcode: upload.shortcode,
                })
              );
            } else if (statusBody.status === 3) {
              clearInterval(poll);
              try {
                if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
              } catch {}
              resolve(
                NextResponse.json(
                  { error: statusBody.message || "Video processing failed" },
                  { status: 500 }
                )
              );
            }
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

export async function GET() {
  return NextResponse.json(
    { error: "GET method not supported. Use POST to upload videos." },
    { status: 405 }
  );
}

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
