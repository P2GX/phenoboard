import { Injectable } from "@angular/core";


// 4. ETL Session Service
@Injectable({
  providedIn: 'root'
})
export class EtlSessionService {
  
  
  parseAgeToIso8601(ageStr: string): string | null {
    const lower = ageStr.trim().toLowerCase();

    // Match decimal years like "2.5 y" or "2.5 years"
    const decimalYearMatch = /(\d+(?:\.\d+)?)\s*(y|year|years)\b/.exec(lower);
    if (decimalYearMatch && !lower.includes('month') && !lower.includes('day')) {
      const yearsFloat = parseFloat(decimalYearMatch[1]);
      const years = Math.floor(yearsFloat);
      const months = Math.round((yearsFloat - years) * 12);
      let result = 'P';
      if (years > 0) result += `${years}Y`;
      if (months > 0) result += `${months}M`;
      return result;
    }

    const yearMatch = /(\d+(?:\.\d+)?)\s*(y|year|years)\b/.exec(lower);
    const monthMatch = /(\d+(?:\.\d+)?)\s*(m|month|months)\b/.exec(lower);
    const dayMatch = /(\d+)\s*(d|day|days)\b/.exec(lower);

    const rawYears = yearMatch ? parseFloat(yearMatch[1]) : 0;
    const rawMonths = monthMatch ? parseFloat(monthMatch[1]) : 0;
    const days = dayMatch ? parseInt(dayMatch[1], 10) : 0;

    const years = Math.floor(rawYears);
    const extraMonths = Math.round((rawYears - years) * 12);
    const months = Math.floor(rawMonths) + extraMonths;

    let result = 'P';
    if (years > 0) result += `${years}Y`;
    if (months > 0) result += `${months}M`;
    if (days > 0) result += `${days}D`;

    return result !== 'P' ? result : null;
  }

  
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}