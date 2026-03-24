import { differenceInYears, isLeapYear, getYear, setYear, isBefore, addYears, parseISO } from "date-fns"

export class BirthdayCalculator {
  static getAge(dateOfBirth: Date | string, currentDate: Date = new Date(), unknownYear: boolean = false): number | null {
    if (unknownYear) return null;
    const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
    return differenceInYears(currentDate, dob);
  }

  static getNextBirthday(dateOfBirth: Date | string, currentDate: Date = new Date()): Date {
    const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
    const currentYear = getYear(currentDate);
    
    let nextBday = setYear(dob, currentYear);
    
    if (dob.getMonth() === 1 && dob.getDate() === 29 && !isLeapYear(new Date(currentYear, 0, 1))) {
      nextBday = new Date(currentYear, 1, 28);
    }

    if (isBefore(nextBday, currentDate)) {
      const nextYear = currentYear + 1;
      nextBday = setYear(dob, nextYear);
      if (dob.getMonth() === 1 && dob.getDate() === 29 && !isLeapYear(new Date(nextYear, 0, 1))) {
        nextBday = new Date(nextYear, 1, 28);
      }
    }
    
    return nextBday;
  }

  static getTimezoneOffsetHours(timezone: string): number {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' });
      const parts = formatter.formatToParts(new Date());
      const offsetString = parts.find(p => p.type === 'timeZoneName')?.value;
      if (!offsetString || offsetString === 'GMT') return 0;
      
      const match = offsetString.match(/GMT([+-]\d+)(?::(\d+))?/);
      if (match) {
        const hours = parseInt(match[1]);
        const mins = match[2] ? parseInt(match[2]) / 60 : 0;
        return hours >= 0 ? hours + mins : hours - mins;
      }
    } catch (e) {
      return 0;
    }
    return 0;
  }
}
