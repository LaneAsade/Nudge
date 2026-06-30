import { CalendarEvent } from '../types';

/**
 * Service to interact directly with the Google Calendar API
 * using the OAuth access token retrieved from Google Sign-In.
 */

// Helper to convert Google Calendar API event structure to our CalendarEvent structure
function mapGoogleEvent(gEvent: any): CalendarEvent {
  return {
    id: gEvent.id,
    title: gEvent.summary || 'Untitled Event',
    start: gEvent.start?.dateTime || gEvent.start?.date || new Date().toISOString(),
    end: gEvent.end?.dateTime || gEvent.end?.date || new Date().toISOString(),
    description: gEvent.description || '',
    type: gEvent.description?.includes('[AI Focus Block]') ? 'ai-scheduled' : 'user',
  };
}

export const gcalService = {
  /**
   * Fetch events from the primary Google Calendar.
   * Fetches events for the next 7 days by default.
   */
  async listEvents(accessToken: string): Promise<CalendarEvent[]> {
    const timeMin = new Date();
    timeMin.setHours(0, 0, 0, 0); // start of today
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 7); // 7 days from now

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` + new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50',
    });

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED_CALENDAR_ACCESS');
      }
      throw new Error(`Google Calendar listEvents failed with status ${response.status}`);
    }

    const data = await response.json();
    const gEvents = data.items || [];
    return gEvents.map(mapGoogleEvent);
  },

  /**
   * Insert an event into the primary Google Calendar.
   */
  async createEvent(
    accessToken: string,
    event: { title: string; start: string; end: string; description: string }
  ): Promise<CalendarEvent> {
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    const body = {
      summary: event.title,
      description: event.description + '\n\n[AI Focus Block] Scheduled by Nudge.',
      start: {
        dateTime: event.start,
      },
      end: {
        dateTime: event.end,
      },
      reminders: {
        useDefault: true,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED_CALENDAR_ACCESS');
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Google Calendar createEvent failed: ${errData.error?.message || response.statusText}`);
    }

    const gEvent = await response.json();
    return mapGoogleEvent(gEvent);
  },

  /**
   * Delete an event from the primary Google Calendar.
   */
  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED_CALENDAR_ACCESS');
      }
      // If event was already deleted, ignore
      if (response.status === 404) return;
      throw new Error(`Google Calendar deleteEvent failed with status ${response.status}`);
    }
  },
};
