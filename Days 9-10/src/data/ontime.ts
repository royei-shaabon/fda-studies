import { readdir, readFile } from "node:fs/promises"; // File-system utilities
import { join } from "node:path"; // Path utility
import { parse } from "csv-parse/sync"; // CSV parser
import { type DataQuery, isWithinDateRange } from "./types";


// Path to the local data folder
const DATA_DIR = join(process.cwd(), "data");


// Raw Reporting Carrier On-Time CSV row
interface RawOnTimeRow {
    YEAR: string;
    MONTH: string;
    ORIGINAIRPORTID: string;
    ORIGIN: string;
    DESTAIRPORTID: string;
    DEST: string;
    DEPDEL15: string;
    ARRDEL15: string;
    CANCELLED: string;
    DIVERTED: string;
}


// Clean typed On-Time record used inside the app
export interface OnTimeRecord {
    year: number;
    month: number;
    originAirportId: number;
    origin: string;
    destAirportId: number;
    dest: string;
    depDelayed15: number | null;
    arrDelayed15: number | null;
    cancelled: number;
    diverted: number;
}


// Normalizes BTS header formatting
function normalizeHeader(header: string): string {
    return header
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
}


// Validates that unknown data matches RawOnTimeRow
function isRawOnTimeRow(data: unknown): data is RawOnTimeRow {
    if (typeof data !== "object" || data === null) return false;

    const row = data as Record<string, unknown>;

    if (typeof row.YEAR !== "string") return false;
    if (typeof row.MONTH !== "string") return false;
    if (typeof row.ORIGINAIRPORTID !== "string") return false;
    if (typeof row.ORIGIN !== "string") return false;
    if (typeof row.DESTAIRPORTID !== "string") return false;
    if (typeof row.DEST !== "string") return false;
    if (typeof row.DEPDEL15 !== "string") return false;
    if (typeof row.ARRDEL15 !== "string") return false;
    if (typeof row.CANCELLED !== "string") return false;
    if (typeof row.DIVERTED !== "string") return false;

    return true;
}


// Converts a required numeric value into a number
function parseRequiredNumber(
    value: string,
    fieldName: string
): number {
    if (value.trim() === "") {
        throw new Error(`Missing ${fieldName} in On-Time row`);
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid ${fieldName} in On-Time row`);
    }

    return parsed;
}


// Converts an optional numeric value into number or null
function parseOptionalNumber(value: string): number | null {
    if (value.trim() === "") {
        return null;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        throw new Error("Invalid numeric value in On-Time row");
    }

    return parsed;
}


// Converts and validates a raw row into OnTimeRecord
function normalizeOnTimeRow(row: RawOnTimeRow): OnTimeRecord {
    const year = parseRequiredNumber(row.YEAR, "year");
    const month = parseRequiredNumber(row.MONTH, "month");

    const originAirportId = parseRequiredNumber(
        row.ORIGINAIRPORTID,
        "origin airport ID"
    );

    const destAirportId = parseRequiredNumber(
        row.DESTAIRPORTID,
        "destination airport ID"
    );

    const depDelayed15 = parseOptionalNumber(row.DEPDEL15);
    const arrDelayed15 = parseOptionalNumber(row.ARRDEL15);

    const cancelled = parseRequiredNumber(
        row.CANCELLED,
        "cancelled"
    );

    const diverted = parseRequiredNumber(
        row.DIVERTED,
        "diverted"
    );


    if (
        !Number.isInteger(year) ||
        year <= 0 ||
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12 ||
        !Number.isInteger(originAirportId) ||
        originAirportId <= 0 ||
        !Number.isInteger(destAirportId) ||
        destAirportId <= 0
    ) {
        throw new Error("Invalid number in On-Time row");
    }


    if (
        (depDelayed15 !== null &&
            depDelayed15 !== 0 &&
            depDelayed15 !== 1) ||
        (arrDelayed15 !== null &&
            arrDelayed15 !== 0 &&
            arrDelayed15 !== 1) ||
        (cancelled !== 0 && cancelled !== 1) ||
        (diverted !== 0 && diverted !== 1)
    ) {
        throw new Error("Invalid indicator in On-Time row");
    }


    return {
        year,
        month,
        originAirportId,
        origin: row.ORIGIN,
        destAirportId,
        dest: row.DEST,
        depDelayed15,
        arrDelayed15,
        cancelled,
        diverted,
    };
}


// Finds all Reporting Carrier On-Time CSV files
async function getOnTimeFiles(): Promise<string[]> {
    const files = await readdir(DATA_DIR);

    return files
        .filter(
            file =>
                file.startsWith("ontime-") &&
                file.endsWith(".csv")
        )
        .sort();
}


// Reads one On-Time CSV file as text
async function loadOnTimeFile(
    fileName: string
): Promise<string> {
    const path = join(DATA_DIR, fileName);

    return readFile(path, "utf-8");
}


// Parses CSV text and validates all raw rows
function parseOnTimeCsv(
    content: string
): RawOnTimeRow[] {
    const data: unknown[] = parse(content, {
        columns: (headers: string[]) =>
            headers.map(normalizeHeader),
        skip_empty_lines: true,
    });

    if (!data.every(isRawOnTimeRow)) {
        throw new Error("Invalid On-Time data");
    }

    return data;
}


// Loads and filters On-Time data by airport and date range
export async function loadOnTimeData(
    query: DataQuery
): Promise<OnTimeRecord[]> {
    const files = await getOnTimeFiles();
    const allRecords: OnTimeRecord[] = [];

    for (const fileName of files) {
        const content = await loadOnTimeFile(fileName);
        const parsedContent = parseOnTimeCsv(content);

        // Filter before normalization because flight-level files are large
        const filteredContent = parsedContent.filter(row => {
            const year = Number(row.YEAR);
            const month = Number(row.MONTH);

            return (
                (
                    query.airports.includes(row.ORIGIN) ||
                    query.airports.includes(row.DEST)
                ) &&
                isWithinDateRange(year, month, query)
            );
        });

        const normalizedContent =
            filteredContent.map(normalizeOnTimeRow);

        for (const record of normalizedContent) {
            allRecords.push(record);
        }

        console.log(
            `Loaded ${fileName}: ${normalizedContent.length} matching records`
        );
    }

    return allRecords;
}