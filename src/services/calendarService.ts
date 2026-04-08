import { Event } from '../types';

/**
 * Service for calendar integration (Google Calendar, iCal/ICS)
 */
export class CalendarService {
    /**
     * Generate a Google Calendar add-event URL
     * @param event - The event object
     * @returns string - The Google Calendar URL
     */
    generateGoogleCalendarUrl(event: Event): string {
        const startTime = event.startTime.toDate().toISOString().replace(/-|:|\.\d\d\d/g, '');
        const endTime = event.endTime.toDate().toISOString().replace(/-|:|\.\d\d\d/g, '');

        const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
        const params = new URLSearchParams({
            text: event.name,
            dates: `${startTime}/${endTime}`,
            details: event.description,
            location: event.location,
            sf: 'true',
            output: 'xml'
        });

        return `${baseUrl}&${params.toString()}`;
    }

    /**
     * Generate an iCalendar (.ics) file content string
     * @param event - The event object
     * @returns string - The ICS file content
     */
    generateIcsContent(event: Event): string {
        const startTime = event.startTime.toDate().toISOString().replace(/-|:|\.\d\d\d/g, '');
        const endTime = event.endTime.toDate().toISOString().replace(/-|:|\.\d\d\d/g, '');
        const now = new Date().toISOString().replace(/-|:|\.\d\d\d/g, '');

        return [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//ClubConnect//University Club Management//EN',
            'BEGIN:VEVENT',
            `UID:${event.eventId}@clubconnect.edu`,
            `DTSTAMP:${now}`,
            `DTSTART:${startTime}`,
            `DTEND:${endTime}`,
            `SUMMARY:${event.name}`,
            `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
            `LOCATION:${event.location}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');
    }

    /**
     * Download the ICS file for an event
     * @param event - The event object
     */
    downloadIcsFile(event: Event): void {
        const content = this.generateIcsContent(event);
        const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${event.name.replace(/\s+/g, '_')}.ics`);
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
}

export const calendarService = new CalendarService();
