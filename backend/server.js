const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

let usersDb = {};
let incidentsDb = {};
let nextUserId = 1;
let nextIncidentId = 1;

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/api/auth/signup', (req, res) => {
    const { name, email, password, role } = req.body;
    const userRole = role || 'citizen';
    
    const existingUser = Object.values(usersDb).find(u => u.email === email);
    if (existingUser) return res.status(400).json({ detail: 'Email already registered' });
    
    const newUser = { id: nextUserId++, name, email, password, role: userRole, created_at: new Date() };
    usersDb[newUser.id] = newUser;
    
    res.json({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role });
});

app.post('/api/auth/login', (req, res) => {
    const rawEmail = req.body.email;
    const rawPassword = req.body.password;
    const email = (rawEmail || '').trim().toLowerCase();
    const password = (rawPassword || '').trim();
    
    console.log(`[LOGIN ATTEMPT] rawEmail: "${rawEmail}", email: "${email}", rawPassword: "${rawPassword}", password: "${password}"`);
    
    // For demo credentials logic
    const demoAccounts = {
        'citizen@urbanpulse.ai': { role: 'citizen', password: 'citizen123' },
        'officer@urbanpulse.ai': { role: 'officer', password: 'officer123' },
        'analyst@urbanpulse.ai': { role: 'analyst', password: 'analyst123' },
        'admin@urbanpulse.ai': { role: 'admin', password: 'admin123' },
        
        // Aliases in case they don't type the full email
        'citizen': { role: 'citizen', password: 'citizen123' },
        'officer': { role: 'officer', password: 'officer123' },
        'analyst': { role: 'analyst', password: 'analyst123' },
        'admin': { role: 'admin', password: 'admin123' }
    };
    
    if (demoAccounts[email] && demoAccounts[email].password === password) {
        const payload = Buffer.from(JSON.stringify({ sub: email, role: demoAccounts[email].role })).toString('base64');
        return res.json({ access_token: `dummy.${payload}.dummy`, token_type: 'bearer' });
    }

    const user = Object.values(usersDb).find(u => u.email.toLowerCase() === email && u.password === password);
    if (!user) return res.status(401).json({ detail: 'Incorrect email or password' });
    
    const payload = Buffer.from(JSON.stringify({ sub: user.email, role: user.role })).toString('base64');
    res.json({ access_token: `dummy.${payload}.dummy`, token_type: 'bearer' });
});

app.get('/api/incidents', (req, res) => {
    res.json(Object.values(incidentsDb));
});

app.post('/api/incidents', (req, res) => {
    const { title, description, category, location, severity, image_url } = req.body;
    const newIncident = {
        id: nextIncidentId++,
        title, description, category, location, 
        severity: severity || 'Medium',
        status: 'Reported',
        image_url,
        verified: false,
        created_at: new Date(),
        user_id: 1
    };
    incidentsDb[newIncident.id] = newIncident;
    res.json(newIncident);
});

app.get('/api/incidents/:id', (req, res) => {
    const incident = incidentsDb[req.params.id];
    if (!incident) return res.status(404).json({ detail: 'Incident not found' });
    res.json(incident);
});

app.post('/api/incidents/:id/analyze', (req, res) => {
    res.json({
        severity_prediction: "Medium",
        confidence_score: 0.87,
        impact_assessment: "Potential traffic disruption in 500m radius",
        affected_radius: 0.5,
        priority_level: "P2"
    });
});

app.listen(8000, () => {
    console.log('Backend connected: Node JS mock server running on port 8000');
    console.log('Database connected: InMemory DB loaded successfully');
    console.log('Endpoints ready');
});
