interface Joke {
    type: string;
    setup: string;
    punchline: string;
    id: number;
}

async function getJoke7() {
    const response = await fetch("https://official-joke-api.appspot.com/random_joke");
    
    if (!response.ok) {
        console.log("Failed");
        return;
    }
    
    const data = (await response.json()) as Joke;
    console.log(`Setup: ${data.setup}`);
    console.log(`Punchline: ${data.punchline}`);
    
}
getJoke7();
