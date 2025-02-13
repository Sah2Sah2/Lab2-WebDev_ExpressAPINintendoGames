require('dotenv').config(); // Load environment variables

const https = require('https');
const express = require("express");
const cors = require('cors'); 
const app = express();

app.use(express.json()); // Parse JSON request body

// Allow requests from your UI's origin
app.use(cors({
    origin: 'http://127.0.0.1:5500', // or your frontend URL
}));

// Use the environment variable
const DOTNET_API_URL = process.env.DOTNET_API_URL;

if (!DOTNET_API_URL) {
    console.error("Error: Missing DOTNET_API_URL in .env file");
    process.exit(1); // Exit if no URL is found
}

// Get all games from the .NET API
app.get('/game', (req, res) => {
    https.get(`${DOTNET_API_URL}/games`, (response) => { 
        let data = '';

        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            if (response.statusCode === 200) {
                res.status(200).json(JSON.parse(data));
            } else {
                res.status(response.statusCode).send(`Failed to fetch games: ${data}`);
            }
        });
    }).on('error', (err) => {
        console.error('Error connecting to .NET API:', err.message);
        res.status(500).send('Error connecting to the .NET API');
    });
});

// Get a specific game by name
app.get('/game/:name', (req, res) => {
    const gameName = req.params.name; 
    
    https.get(`${DOTNET_API_URL}/game?name=${encodeURIComponent(gameName)}`, (response) => {
        let data = '';

        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            if (response.statusCode === 200) {
                res.status(200).json(JSON.parse(data));
            } else if (response.statusCode === 404) {
                res.status(404).send(`Game with name '${gameName}' not found`);
            } else {
                res.status(response.statusCode).send(`Failed to fetch game: ${data}`);
            }
        });
    }).on('error', (err) => {
        console.error('Error fetching game: ', err.message);
        res.status(500).send('Error fetching game data');
    });
});

// Add a new game to the .NET API
app.post('/game', (req, res) => {
    const { name, genre, releaseYear, developer } = req.body;

    if (!name || !genre || !releaseYear || !developer) {
        return res.status(400).send('Missing required fields: name, genre, releaseYear, developer');
    }

    const newGame = { name, genre, releaseYear, developer };
    const newGameJson = JSON.stringify(newGame); // ✅ Fix: Convert to JSON

    const options = {
        hostname: new URL(DOTNET_API_URL).hostname, // ✅ Fix: Use DOTNET_API_URL dynamically
        path: '/game',  
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(newGameJson) // ✅ Fix: Correct Content-Length
        }
    };

    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => {
            data += chunk;
        });
        
        response.on('end', () => {
            if (response.statusCode === 201 || response.statusCode === 200) {
                res.status(201).send('Game successfully added to the .NET API!');
            } else {
                res.status(response.statusCode).send(`Failed to add game: ${data}`);
            }
        });
    });

    request.on('error', (err) => {
        console.error('Error adding game:', err.message);
        res.status(500).send('Error connecting to the .NET API');
    });

    request.write(newGameJson);  
    request.end();
});

// Start the local server 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Node API running on port ${PORT}`);
});
