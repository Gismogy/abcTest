const express = require('express');
const path = require('path');
const { createServer } = require('http');

const app = express();
const port = 8080;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const server = app.listen(port, () => {
    console.log(`WebGPU Living Room server running at http://localhost:${port}`);
    console.log(`Access the living room at: http://localhost:${port}`);
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});