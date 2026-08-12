import { readFile } from "node:fs/promises"; // File-system utility
import { join } from "node:path"; // Path utility
import { parse } from "csv-parse/sync"; // CSV parser
import { type DataQuery, isWithinDateRange } from "./types";

const DATA_DIR = join(process.cwd(), "data");
const DELAY_CAUSES_FILE = join(DATA_DIR, "delay-causes.csv");

// Raw Delay Cause CSV row - all values arrive as strings
interface RawDelayCauseRow {
    year: string;
    month: string;
    carrier: string;
    carrier_name: string;
    airport: string;
    airport_name: string;
    arr_flights: string;
    arr_del15: string;
    carrier_ct: string;
    weather_ct: string;
    nas_ct: string;
    security_ct: string;
    late_aircraft_ct: string;
    arr_cancelled: string;
    arr_diverted: string;
    arr_delay: string;
    carrier_delay: string;
    weather_delay: string;
    nas_delay: string;
    security_delay: string;
    late_aircraft_delay: string;
}

// Clean typed On-Time record used inside the app
export interface DelayCauseRecord {
    year: number;
    month: number;
    carrier: string;
    carrierName: string;
    airport: string;
    airportName: string;
    arrivalFlights: number | null;
    delayed15: number | null;
    carrierDelayCount: number | null;
    weatherDelayCount: number | null;
    nasDelayCount: number | null;
    securityDelayCount: number | null;
    lateAircraftDelayCount: number | null;
    cancelled: number | null;
    diverted: number | null;
    totalDelayMinutes: number | null;
    carrierDelayMinutes: number | null;
    weatherDelayMinutes: number | null;
    nasDelayMinutes: number | null;
    securityDelayMinutes: number | null;
    lateAircraftDelayMinutes: number | null;
}

// Validates that unknown data matches RawDelayCauseRow
function isRawDelayCauseRow(data: unknown): data is RawDelayCauseRow {
    if (typeof data !== "object" || data === null) return false;

    const row = data as Record<string, unknown>;

    if (typeof row.year !== "string") return false;
    if (typeof row.month !== "string") return false;
    if (typeof row.carrier !== "string") return false;
    if (typeof row.carrier_name !== "string") return false;
    if (typeof row.airport !== "string") return false;
    if (typeof row.airport_name !== "string") return false;
    if (typeof row.arr_flights !== "string") return false;
    if (typeof row.arr_del15 !== "string") return false;
    if (typeof row.carrier_ct !== "string") return false;
    if (typeof row.weather_ct !== "string") return false;
    if (typeof row.nas_ct !== "string") return false;
    if (typeof row.security_ct !== "string") return false;
    if (typeof row.late_aircraft_ct !== "string") return false;
    if (typeof row.arr_cancelled !== "string") return false;
    if (typeof row.arr_diverted !== "string") return false;
    if (typeof row.arr_delay !== "string") return false;
    if (typeof row.carrier_delay !== "string") return false;
    if (typeof row.weather_delay !== "string") return false;
    if (typeof row.nas_delay !== "string") return false;
    if (typeof row.security_delay !== "string") return false;
    if (typeof row.late_aircraft_delay !== "string") return false;

    return true;
}

// Converts an optional numeric value into number or null
function parseOptionalNumber(value: string): number | null {
    if (value.trim() === "") {
        return null;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        throw new Error("Invalid numeric value in Delay Cause row");
    }

    return parsed;
}

// Converts and validates a raw row into DelayCauseRecord
function normalizeDelayCauseRow(row: RawDelayCauseRow): DelayCauseRecord {
    const year = Number(row.year);
    const month = Number(row.month);

    if (
        !Number.isInteger(year) ||
        year <= 0 ||
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12
    ) {
        throw new Error("Invalid year or month in Delay Cause row");
    }

    return {
        year,
        month,
        carrier: row.carrier,
        carrierName: row.carrier_name,
        airport: row.airport,
        airportName: row.airport_name,

        arrivalFlights: parseOptionalNumber(row.arr_flights),
        delayed15: parseOptionalNumber(row.arr_del15),

        carrierDelayCount: parseOptionalNumber(row.carrier_ct),
        weatherDelayCount: parseOptionalNumber(row.weather_ct),
        nasDelayCount: parseOptionalNumber(row.nas_ct),
        securityDelayCount: parseOptionalNumber(row.security_ct),
        lateAircraftDelayCount: parseOptionalNumber(row.late_aircraft_ct),

        cancelled: parseOptionalNumber(row.arr_cancelled),
        diverted: parseOptionalNumber(row.arr_diverted),

        totalDelayMinutes: parseOptionalNumber(row.arr_delay),
        carrierDelayMinutes: parseOptionalNumber(row.carrier_delay),
        weatherDelayMinutes: parseOptionalNumber(row.weather_delay),
        nasDelayMinutes: parseOptionalNumber(row.nas_delay),
        securityDelayMinutes: parseOptionalNumber(row.security_delay),
        lateAircraftDelayMinutes: parseOptionalNumber(row.late_aircraft_delay),
    };
}

// Parses CSV text and validates all raw rows
function parseDelayCauseCsv(content: string): RawDelayCauseRow[] {
    const data: unknown[] = parse(content, {
        columns: true,
        skip_empty_lines: true,
    });

    if (!data.every(isRawDelayCauseRow)) {
        throw new Error("Invalid Delay Cause data");
    }

    return data;
}

// Loads and filters Delay Cause records
export async function loadDelayCausesData(
    query: DataQuery
): Promise<DelayCauseRecord[]> {
    const content = await readFile(DELAY_CAUSES_FILE, "utf-8");
    const parsedContent = parseDelayCauseCsv(content);
    const normalizedContent = parsedContent.map(normalizeDelayCauseRow);

    return normalizedContent.filter(record =>
        query.airports.includes(record.airport) &&
        isWithinDateRange(record.year, record.month, query)
    );
}