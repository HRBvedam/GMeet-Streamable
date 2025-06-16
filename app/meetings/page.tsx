"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import GoogleButton from "react-google-button";
import { useState } from "react";
import meetingsData from "@/public/meetings.json"

interface Meeting {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  timeZone: string;
}

interface CreatedMeeting extends Meeting {
  meetLink?: string;
  calendarLink?: string;
  eventId?: string;
}

export default function Component() {
  const { data: session, status } = useSession();
  const [createdMeetings, setCreatedMeetings] = useState<CreatedMeeting[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const createMeeting = async (meeting: Meeting) => {
    setLoading(meeting.id);
    try {
      console.log('Creating meeting:', meeting);
      
      const response = await fetch('/api/calendar/create-meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meeting),
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (data.success) {
        const createdMeeting: CreatedMeeting = {
          ...meeting,
          meetLink: data.event.meetLink,
          calendarLink: data.event.calendarLink,
          eventId: data.event.id,
        };
        
        setCreatedMeetings(prev => [...prev, createdMeeting]);
      } else {
        console.error('Error creating meeting:', data);
        alert(`Failed to create meeting: ${data.error}\n\nSuggestion: ${data.suggestion || 'Please try again or check console for details'}`);
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Network error occurred. Please check your connection and try again.');
    } finally {
      setLoading(null);
    }
  };

  if (status === "loading") return (
    <div className="p-6 max-w-md mx-auto text-center">
      <p>Loading...</p>
    </div>
  );

  if (session) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-white">
           Meeting Automation
        </h1>

        {/* User Profile Section */}
        <div className="mb-8 p-6 bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src={session.user?.image || "/default-avatar.png"}
                alt="Profile"
                className="w-12 h-12 rounded-full mr-4"
              />
              <div>
                <h3 className="font-semibold text-lg text-black">{session.user?.name}</h3>
                <p className="text-gray-600">{session.user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Available Meetings */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Available Meetings</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {meetingsData.meetings.map((meeting) => {
              const isCreated = createdMeetings.some(cm => cm.id === meeting.id);
              const isLoading = loading === meeting.id;
              
              return (
                <div key={meeting.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="mb-4">
                    <h3 className="font-bold text-xl text-gray-800 mb-2">{meeting.title}</h3>
                    <p className="text-gray-600 mb-3">{meeting.description}</p>
                    
                    <div className="space-y-1 text-sm text-gray-500">
                      <div>
                        <span className="font-medium">Start:</span> {formatDateTime(meeting.startTime)}
                      </div>
                      <div>
                        <span className="font-medium">End:</span> {formatDateTime(meeting.endTime)}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => createMeeting(meeting)}
                    disabled={isCreated || isLoading}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                      isCreated
                        ? 'bg-green-100 text-green-700 cursor-not-allowed border border-green-200'
                        : isLoading
                        ? 'bg-blue-100 text-blue-700 cursor-not-allowed border border-blue-200'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {isCreated ? 'Meeting Created' : isLoading ? 'Creating...' : 'Create Meet Link'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Created Meetings with Meet Links */}
        {createdMeetings.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Your Meeting Links</h2>
            <div className="space-y-4">
              {createdMeetings.map((meeting) => (
                <div key={meeting.eventId} className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="mb-4 lg:mb-0">
                      <h3 className="font-bold text-xl text-gray-800 mb-2">{meeting.title}</h3>
                      <p className="text-gray-600 mb-2">{meeting.description}</p>
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">{formatDateTime(meeting.startTime)}</span>
                        <span className="mx-2">→</span>
                        <span>{formatDateTime(meeting.endTime)}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      {meeting.meetLink && (
                        <a
                          href={meeting.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition-colors font-semibold text-center"
                        >
                           Join Google Meet
                        </a>
                      )}
                      {meeting.calendarLink && (
                        <a
                          href={meeting.calendarLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors font-semibold text-center"
                        >
                           View in Calendar
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto text-center">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-4 text-gray-800"> Meeting Manager</h1>
        <p className="mb-6 text-gray-600">Sign in with Google to create and manage your meeting links</p>
        <GoogleButton onClick={() => signIn("google")} />
      </div>
    </div>
  );
}