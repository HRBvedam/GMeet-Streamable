import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Creating calendar event...')
    
    const session = await getServerSession(authOptions)
    
    if (!session || !session.accessToken) {
      console.log('❌ No valid session found')
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in again to grant calendar permissions' },
        { status: 401 }
      )
    }

    console.log('✅ Session found, access token available')

    const meetingData: MeetingData = await request.json()
    console.log('📅 Meeting data:', meetingData)
    
    // Create calendar event with Google Meet
    const calendarEvent = {
      summary: meetingData.title,
      description: meetingData.description,
      start: {
        dateTime: meetingData.startTime,
        timeZone: meetingData.timeZone,
      },
      end: {
        dateTime: meetingData.endTime,
        timeZone: meetingData.timeZone,
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${meetingData.id}-${Date.now()}`, // Unique ID
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    }

    console.log('📤 Sending request to Google Calendar API...')

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent),
      }
    )

    console.log('📥 Google Calendar API response status:', response.status)

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Calendar API Error:', errorData)
      return NextResponse.json(
        { 
          error: 'Failed to create calendar event', 
          details: errorData,
          suggestion: 'Please ensure Calendar API is enabled in Google Cloud Console'
        },
        { status: response.status }
      )
    }

    const createdEvent = await response.json()
    console.log('✅ Event created successfully:', createdEvent.id)
    
    // Extract Meet link
    const meetLink = createdEvent.conferenceData?.entryPoints?.find(
      (ep: any) => ep.entryPointType === 'video'
    )?.uri || createdEvent.hangoutLink

    console.log('🔗 Meet link generated:', meetLink)

    return NextResponse.json({
      success: true,
      event: {
        id: createdEvent.id,
        title: createdEvent.summary,
        startTime: createdEvent.start.dateTime,
        endTime: createdEvent.end.dateTime,
        meetLink: meetLink,
        calendarLink: createdEvent.htmlLink
      }
    })

  } catch (error) {
    console.error('💥 Error creating meeting:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}