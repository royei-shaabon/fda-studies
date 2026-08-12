import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "csv-parse/sync";

const DATA_DIR = join(process.cwd(), "data");

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

interface T100Record {
    DEPARTURES_PERFORMED: number;
    PASSENGERS: number;
    DISTANCE: number;
    UNIQUE_CARRIER: string;
    ORIGIN_AIRPORT_ID: number;
    ORIGIN: string;
    ORIGIN_STATE_ABR: string;
    ORIGIN_COUNTRY: string;
    DEST_AIRPORT_ID: number;
    DEST: string;
    DEST_STATE_ABR: string;
    DEST_COUNTRY: string;
    YEAR: number;
    MONTH: number;
    CLASS: string;
    DATA_SOURCE:string;
}


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



async function getT100Files(): Promise<string[]> {
    const files = await readdir(DATA_DIR);
    const dataFiles = files.filter(
        files => files.startsWith("t100-") && files.endsWith (".csv")
    )
    
    return (dataFiles);
}


async function loadT100File(fileName: string): Promise<string> {
    const path = join(DATA_DIR, fileName);
    const content = await readFile(path, "utf-8");

    return content;
}

function parseT100Csv(content: string): RawT100Row[]{
    const data: unknown[] = parse(content, {
        columns: true, skip_empty_lines: true
    });

    if (!data.every(isRawT100Row)) {
        throw new Error("Invalid T100 data");
    }

    return data;
}



async function main() {
    const files = await getT100Files();
    const firstFile = files[0];

    const content = await loadT100File(firstFile);

    const records = parseT100Csv(content);

    console.log(records[0]);
}


main();