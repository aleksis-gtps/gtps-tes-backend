// Import dependencies
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const path = require('path');

// Initialize the app
const app = express();
const PORT = 5000;

// Middleware
app.use(compression({
    level: 5,
    threshold: 0,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
    );
    next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 100, headers: true }));
app.use(function (req, res, next) {
    console.log(req.method, req.url);
    next();
});
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// In-memory database for demo purposes
const sessions = {};

// Utility function to generate a random token
const generateToken = () => crypto.randomBytes(32).toString('hex');

/**
 * Path: /player/login/dashboard
 * Description: Handles login request and redirects with encoded data
 */
app.post('/player/login/dashboard', (req, res) => {
    const tData = {};
    let encData = "";
    try {
        const uData = JSON.stringify(req.body).split('"')[1].split('\\n'); 
        const uName = uData[0].split('|'); 
        const uPass = uData[1].split('|');
        for (let i = 0; i < uData.length - 1; i++) { 
            const d = uData[i].split('|'); 
            tData[d[0]] = d[1]; 
        }
        encData = Buffer.from(JSON.stringify(tData)).toString('base64');
        if (uName[1] && uPass[1]) { 
            res.status(302).redirect(`/player/growid/login/validate?token=${encData}`); 
        }
    } catch (why) { 
        console.log(`Warning: ${why}`); 
    }

    res.status(302).redirect(`/player/growid/login/validate?token=${encData}`);
});

/**
 * Path: /player/growid/login/validate
 * Description: Validates login credentials and returns token
 */
app.all('/player/growid/login/validate', (req, res) => {
    const _token = req.query.token;
    const growId = req.body.growId;
    const password = req.body.password;

    const token = Buffer.from(
        `_token=${_token}&growId=${growId}&password=${password}`,
    ).toString('base64');

    res.send(
        `{"status":"success","message":"Account Validated.","token":"${token}","url":"","accountType":"growtopia"}`,
    );
});

/**
 * Path: /logout
 * Description: Logs the user out and deletes the session
 */
app.post('/logout', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'RefreshToken is required' });
    }

    if (sessions[refreshToken]) {
        delete sessions[refreshToken];
        return res.json({ success: true, message: 'Logged out successfully' });
    }

    res.status(401).json({ error: 'Invalid token' });
});

/**
 * Path: /
 * Description: Serves the HTML page
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
