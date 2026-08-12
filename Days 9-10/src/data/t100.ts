import { readdir, readFile } from "node:fs/promises"; // File-system utilities
import { join } from "node:path"; // Path utility
import { parse } from "csv-parse/sync"; // CSV parser
import { DataQuery, isWithinDateRange } from "./types";

// Path to the local data folder
const DATA_DIR = join(process.cwd(), "data");

// Raw T-100 CSV row - all values arrive as strings
interface RawT100Row {
    DEPARTURES_PERFORMED: string;
    PASSENGERS: string;
    DISTANCE: string;
    UNIQUE_CARRIER: string;
    ORIGIN_AIRPORT_ID: string;
    ORIGIN: string;
    ORIGIN_STATE_ABR: string;
    ORIGIN_COUNTRY: string;
    DEST_AIRPORT_ID: string;
    DEST: string;
    DEST_STATE_ABR: string;
    DEST_COUNTRY: string;
    YEAR: string;
    MONTH: string;
    CLASS: string;
    DATA_SOURCE: string;
}

// Clean typed T-100 record used inside the app
export interface T100Record {
    departuresPerformed: number;
    passengers: number;
    distanceMiles: number;
    uniqueCarrier: string;
    originAirportId: number;
    origin: string;
    originState: string;
    originCountry: string;
    destAirportId: number;
    dest: string;
    destState: string;
    destCountry: string;
    year: number;
    month: number;
    serviceClass: string;
    dataSource:string;
}

// Validates that unknown data matches RawT100Row
function isRawT100Row(data: unknown): data is RawT100Row {
    if (typeof data !== "object" || data === null) return false;

    const row = data as Record<string, unknown>;

    if (typeof row.DEPARTURES_PERFORMED !== "string") return false;
    if (typeof row.PASSENGERS !== "string") return false;
    if (typeof row.DISTANCE !== "string") return false;
    if (typeof row.UNIQUE_CARRIER !== "string") return false;
    if (typeof row.ORIGIN_AIRPORT_ID !== "string") return false;
    if (typeof row.ORIGIN !== "string") return false;
    if (typeof row.ORIGIN_STATE_ABR !== "string") return false;
    if (typeof row.ORIGIN_COUNTRY !== "string") return false;
    if (typeof row.DEST_AIRPORT_ID !== "string") return false;
    if (typeof row.DEST !== "string") return false;
    if (typeof row.DEST_STATE_ABR !== "string") return false;
    if (typeof row.DEST_COUNTRY !== "string") return false;
    if (typeof row.YEAR !== "string") return false;
    if (typeof row.MONTH !== "string") return false;
    if (typeof row.CLASS !== "string") return false;
    if (typeof row.DATA_SOURCE !== "string") return false;
    return true;
}

// Converts and validates a raw row into T100Record
function normalizeT100Row(row: RawT100Row): T100Record{
    const numericFields = [
        row.DEPARTURES_PERFORMED,
        row.PASSENGERS,
        row.DISTANCE,
        row.ORIGIN_AIRPORT_ID,
        row.DEST_AIRPORT_ID,
        row.YEAR,
        row.MONTH,
    ];


    if (numericFields.some(value => value.trim() === "")) {
        throw new Error("Missing numeric value in T100 row");
    }

    const parsedDeparturesPerformed = Number(row.DEPARTURES_PERFORMED);
    const parsedPassengers = Number(row.PASSENGERS);
    const parsedDistanceMiles = Number(row.DISTANCE);
    const parsedOriginAirportId = Number(row.ORIGIN_AIRPORT_ID);
    const parsedDestAirportId = Number(row.DEST_AIRPORT_ID);
    const parsedYear = Number(row.YEAR);
    const parsedMonth = Number(row.MONTH);

    if (
        !Number.isFinite(parsedDeparturesPerformed) ||
        !Number.isFinite(parsedPassengers) ||
        !Number.isFinite(parsedDistanceMiles) ||
        !Number.isFinite(parsedOriginAirportId) ||
        !Number.isFinite(parsedDestAirportId) ||
        !Number.isFinite(parsedYear) ||
        !Number.isFinite(parsedMonth)
    ) {
        throw new Error("Invalid numeric value in T100 row");
    }

    if (parsedMonth < 1 || parsedMonth > 12 || !Number.isInteger(parsedMonth)) {
        throw new Error("Invalid month in T100 row");
    }

    if (parsedYear <= 0 || !Number.isInteger(parsedYear) ||
    parsedOriginAirportId <= 0 || !Number.isInteger(parsedOriginAirportId) ||
    parsedDestAirportId <= 0 || !Number.isInteger(parsedDestAirportId) ||
    parsedPassengers < 0 || !Number.isInteger(parsedPassengers) ||
    parsedDistanceMiles < 0 ||
    parsedDeparturesPerformed < 0) {
        throw new Error("Invalid number in T100 row");
    }

    return {
        departuresPerformed: parsedDeparturesPerformed,
        passengers: parsedPassengers,
        distanceMiles: parsedDistanceMiles,
        uniqueCarrier: row.UNIQUE_CARRIER,
        originAirportId: parsedOriginAirportId,
        origin: row.ORIGIN,
        originState: row.ORIGIN_STATE_ABR,
        originCountry: row.ORIGIN_COUNTRY,
        destAirportId: parsedDestAirportId,
        dest: row.DEST,
        destState: row.DEST_STATE_ABR,
        destCountry: row.DEST_COUNTRY,
        year: parsedYear,
        month: parsedMonth,
        serviceClass: row.CLASS,
        dataSource: row.DATA_SOURCE,
    };
}


// Finds all T-100 CSV files in the data folder
async function getT100Files(): Promise<string[]> {
    const files = await readdir(DATA_DIR);

    const dataFiles = files.filter(
        file => file.startsWith("t100-") && file.endsWith (".csv")
    )
    
    return dataFiles;
}

// Reads one T-100 CSV file as text
async function loadT100File(fileName: string): Promise<string> {
    const path = join(DATA_DIR, fileName);
    const content = await readFile(path, "utf-8");

    return content;
}

// Loads and filters T-100 data by airport and date range
export async function loadT100Data(
    query: DataQuery
): Promise<T100Record[]> {
    const files = await getT100Files();
    const allRecords: T100Record[] = [];

    for (const fileName of files) {
        const content = await loadT100File(fileName);
        const parsedContent = parseT100Csv(content);
        const normalizedContent = parsedContent.map(normalizeT100Row);

        const filteredContent = normalizedContent.filter(record =>
            (
                query.airports.includes(record.origin) ||
                query.airports.includes(record.dest)
            ) &&
            isWithinDateRange(record.year, record.month, query)
        );

        for (const record of filteredContent) {
            allRecords.push(record);
        }
    }

    return allRecords;
}

// Parses CSV text and validates all raw rows
function parseT100Csv(content: string): RawT100Row[]{
    const data: unknown[] = parse(content, {
        columns: true, skip_empty_lines: true
    });

    if (!data.every(isRawT100Row)) {
        throw new Error("Invalid T100 data");
    }

    return data;
}