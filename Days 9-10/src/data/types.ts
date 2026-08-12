// Query used to filter data by airports and date range
export interface DataQuery {
    airports: string[];
    startYear: number;
    startMonth: number;
    endYear: number;
    endMonth: number;
}

// Checks whether a year/month is inside the requested range
export function isWithinDateRange(
    year: number,
    month: number,
    query: DataQuery
): boolean {
    const current = year * 100 + month;
    const start = query.startYear * 100 + query.startMonth;
    const end = query.endYear * 100 + query.endMonth;

    return current >= start && current <= end;
}