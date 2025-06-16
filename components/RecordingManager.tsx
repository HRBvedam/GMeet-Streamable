"use client";
import React, { useState, useEffect } from "react";
import {
  Download,
  Video,
  Calendar,
  Clock,
  HardDrive,
  Hash,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";

interface Recording {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  size: string;
  sizeFormatted: string;
  meetingId?: string;
  description?: string;
  participants?: string[];
  duration?: string;

  calendarEventId?: string;
  hostEmail?: string;
  hostName?: string;
}

const RecordingManager = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [expandedRecording, setExpandedRecording] = useState<string | null>(
    null
  );

  // Fetch available recordings
  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/recordings/list");
      const data = await response.json();

      if (data.success) {
        setRecordings(data.recordings);
        setMessage(`Found ${data.total} recordings`);
      } else {
        setMessage("Failed to fetch recordings");
      }
    } catch (error) {
      setMessage("Error fetching recordings");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Download specific recording
  const downloadRecording = async (recording: Recording) => {
    setDownloading(recording.id);
    try {
      const response = await fetch("/api/recordings/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recordingId: recording.id,
          meetingTitle: recording.name.replace(/\.[^/.]+$/, ""), // Remove extension
          recordingDate: recording.createdTime,
          meetingId: recording.meetingId,
          // Add these for better file naming
          calendarEventId: recording.calendarEventId,
          hostEmail: recording.hostEmail,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ Recording downloaded: ${data.fileName}`);
      } else {
        setMessage(`❌ Download failed: ${data.error}`);
      }
    } catch (error) {
      setMessage("❌ Error downloading recording");
      console.error("Error:", error);
    } finally {
      setDownloading(null);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Extract meeting ID from filename or description
  const extractMeetingId = (name: string, description?: string) => {
    // Try to extract from name first (common patterns)
    const patterns = [
      /meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i,
      /meeting[_-]id[_:-]?([a-z]{3}-[a-z]{4}-[a-z]{3})/i,
      /([a-z]{3}-[a-z]{4}-[a-z]{3})/i,
    ];

    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match) return match[1];
    }

    // Try description if available
    if (description) {
      for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match) return match[1];
      }
    }

    return null;
  };

  // Generate unique display name with host info
  const getUniqueDisplayName = (recording: Recording) => {
    const baseName = recording.name.replace(/\.[^/.]+$/, "");
    const meetingId =
      recording.meetingId ||
      extractMeetingId(recording.name, recording.description);
    const hostInfo = recording.hostEmail
      ? `@${recording.hostEmail.split("@")[0]}`
      : "";

    if (meetingId && hostInfo) {
      return `${baseName} (${meetingId.slice(-6)}${hostInfo})`;
    } else if (meetingId) {
      return `${baseName} (${meetingId.slice(-6)})`;
    } else if (hostInfo) {
      return `${baseName} (${hostInfo})`;
    }

    return baseName;
  };

  // Toggle expanded view
  const toggleExpanded = (recordingId: string) => {
    setExpandedRecording(
      expandedRecording === recordingId ? null : recordingId
    );
  };

  // Group recordings by meeting title and host for better organization
  const groupRecordings = (recordings: Recording[]) => {
    const groups = new Map();

    recordings.forEach((recording) => {
      const baseName = recording.name.replace(/\.[^/.]+$/, "");
      const hostEmail = recording.hostEmail || "unknown";
      const key = `${baseName}_${hostEmail}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(recording);
    });

    return Array.from(groups.entries()).map(([key, recordings]) => ({
      groupKey: key,
      recordings: recordings.sort(
        (a: any, b: any) =>
          new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
      ),
    }));
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  // Remove the grouping for cleaner individual card view

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg my-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Video className="text-blue-600" />
          Google Meet Recordings
        </h2>
        <button
          onClick={fetchRecordings}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg mb-4 ${
            message.includes("✅")
              ? "bg-green-100 text-green-800"
              : message.includes("❌")
              ? "bg-red-100 text-red-800"
              : "bg-blue-100 text-blue-800"
          }`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recordings...</p>
        </div>
      ) : recordings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Video className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No recordings found</p>
          <p className="text-sm mt-2">
            Record a Google Meet session to see it here
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {recordings.map((recording) => {
            const meetingId =
              recording.meetingId ||
              extractMeetingId(recording.name, recording.description);
            const isExpanded = expandedRecording === recording.id;

            return (
              <div
                key={recording.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                {/* Main Recording Card */}
                <div className="p-6">
                  {/* Header with Title and Status Badges */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {recording.name.replace(/\.[^/.]+$/, "")}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {meetingId && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                            <Hash className="h-3.5 w-3.5" />
                            {meetingId}
                          </span>
                        )}
                        {recording.calendarEventId && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                            <Calendar className="h-3.5 w-3.5" />
                            {recording.calendarEventId.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpanded(recording.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title={
                          isExpanded ? "Collapse details" : "Expand details"
                        }>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </button>

                      <button
                        onClick={() => downloadRecording(recording)}
                        disabled={downloading === recording.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors">
                        {downloading === recording.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            Download
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Key Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {/* Host Information */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Host
                        </p>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {recording.hostName ||
                            recording.hostEmail?.split("@")[0] ||
                            "Unknown Host"}
                        </p>
                        {recording.hostEmail && recording.hostName && (
                          <p className="text-xs text-gray-500 truncate">
                            {recording.hostEmail}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-green-100 rounded-full">
                        <Clock className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Recorded
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(recording.createdTime).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(recording.createdTime).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {/* File Size */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-orange-100 rounded-full">
                        <HardDrive className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Size
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {recording.sizeFormatted}
                        </p>
                        <p className="text-xs text-gray-500">
                          {recording.mimeType}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        Recording Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Meeting ID */}
                        {meetingId && (
                          <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                            <div className="flex items-center gap-2 mb-1">
                              <Hash className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-900">
                                Meeting ID
                              </span>
                            </div>
                            <p className="text-sm text-blue-800 font-mono">
                              {meetingId}
                            </p>
                          </div>
                        )}

                        {/* Calendar Event ID */}
                        {recording.calendarEventId && (
                          <div className="p-3 border border-purple-200 rounded-lg bg-purple-50">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium text-purple-900">
                                Calendar Event ID
                              </span>
                            </div>
                            <p className="text-sm text-purple-800 font-mono break-all">
                              {recording.calendarEventId}
                            </p>
                          </div>
                        )}

                        {/* File ID */}
                        <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-2 mb-1">
                            <Video className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-900">
                              File ID
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 font-mono break-all">
                            {recording.id}
                          </p>
                        </div>

                        {/* Full Filename */}
                        <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-2 mb-1">
                            <HardDrive className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-900">
                              Full Filename
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 break-all">
                            {recording.name}
                          </p>
                        </div>

                        {/* Description if available */}
                        {recording.description && (
                          <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 md:col-span-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-900">
                                Description
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">
                              {recording.description}
                            </p>
                          </div>
                        )}

                        {/* Participants if available */}
                        {recording.participants &&
                          recording.participants.length > 0 && (
                            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 md:col-span-2">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-900">
                                  Participants
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">
                                {recording.participants.join(", ")}
                              </p>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <Video className="h-5 w-5" />
          Recording Information Guide
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <h4 className="font-medium mb-1">Identification Fields:</h4>
            <ul className="space-y-1">
              <li>
                • <strong>Meeting ID:</strong> Google Meet room identifier
              </li>
              <li>
                • <strong>Calendar Event ID:</strong> Links to calendar event
              </li>
              <li>
                • <strong>Host Info:</strong> Who organized the meeting
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1">File Details:</h4>
            <ul className="space-y-1">
              <li>
                • <strong>File ID:</strong> Unique Google Drive identifier
              </li>
              <li>
                • <strong>Timestamp:</strong> When recording was created
              </li>
              <li>
                • <strong>Size:</strong> File size and format information
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingManager;
