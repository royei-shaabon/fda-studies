import {
    loadT100Data,
    loadOnTimeData,
    loadDelayCausesData,
    type DataQuery,
} from "./data/index";


async function main() {
    const query: DataQuery = {
        airports: ["LAX", "SNA"],
        startYear: 2025,
        startMonth: 7,
        endYear: 2026,
        endMonth: 6,
    };


    const t100Data = await loadT100Data(query);

    console.log("T100 records:", t100Data.length);
    console.log("T100 sample:", t100Data[0]);


    const onTimeData = await loadOnTimeData(query);

    console.log("On-Time records:", onTimeData.length);
    console.log("On-Time sample:", onTimeData[0]);


    const delayCausesData =
        await loadDelayCausesData(query);

    console.log(
        "Delay Cause records:",
        delayCausesData.length
    );

    console.log(
        "Delay Cause sample:",
        delayCausesData[0]
    );
}


main().catch(console.error);