const API_BASE_URL = 'http://127.0.0.1:8000';

interface SignupData {
  name: string;
  email: string;
  password: string;
  role: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface IncidentData {
  title: string;
  description: string;
  category: string;
  location: string;
  severity?: string;
  image_url?: string;
  lat?: number;
  lng?: number;
}

interface Coords {
  lat: number;
  lng: number;
}

const fetchWithTimeout = async (url: string, options: any = {}) => {
  const { timeout = 30000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...rest, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

const get = (path: string, opts?: any) =>
  fetchWithTimeout(`${API_BASE_URL}${path}`, opts).then((r) => {
    if (!r.ok) throw new Error(`GET ${path} failed (${r.status})`);
    return r.json();
  });

const post = (path: string, body?: any) =>
  fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => {
    if (!r.ok) throw new Error(`POST ${path} failed (${r.status})`);
    return r.json();
  });

const put = (path: string, body?: any) =>
  fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => {
    if (!r.ok) throw new Error(`PUT ${path} failed (${r.status})`);
    return r.json();
  });

export const api = {
  // ── Auth ─────────────────────────────────────
  async signup(data: SignupData) {
    return post('/api/auth/signup', data);
  },
  async login(data: LoginData) {
    return post('/api/auth/login', data);
  },

  // ── Incidents ────────────────────────────────
  async getIncidents() {
    return get('/api/incidents');
  },
  async createIncident(data: IncidentData) {
    return post('/api/incidents', data);
  },
  async getIncident(id: number) {
    return get(`/api/incidents/${id}`);
  },
  async analyzeIncident(id: number) {
    return post(`/api/incidents/${id}/analyze`);
  },
  async verifyIncident(id: number) {
    return post(`/api/incidents/${id}/verify`);
  },
  async communityVerifyIncident(id: number, action: string) {
    return post(`/api/incidents/${id}/community-verify`, { action });
  },
  async updateIncidentStatus(id: number, status: string) {
    return put(`/api/incidents/${id}/status`, { status });
  },
  async getNearbyIncidents(lat: number, lng: number, radius = 2) {
    return get(`/api/incidents/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
  },

  // ── Traffic Intelligence ─────────────────────
  async getTrafficPredictions() {
    return get('/api/traffic/predictions');
  },
  async getTrafficCongestion() {
    return get('/api/traffic/congestion');
  },
  async getTrafficTrends() {
    return get('/api/traffic/trends');
  },
  async getTrafficForecast() {
    return get('/api/traffic/forecast');
  },

  // Legacy
  async predictTraffic() {
    return get('/predict-traffic');
  },

  // ── Route Optimization ───────────────────────
  async optimizeRoute(origin: Coords, destination: Coords) {
    return post('/api/routes/optimize', { origin, destination });
  },
  async emergencyRoute(origin: Coords, destination: Coords) {
    return post('/api/routes/emergency', { origin, destination });
  },

  // Legacy
  async routeOptimization(origin: Coords, destination: Coords) {
    return post('/route-optimization', { origin, destination });
  },

  // ── Weather ──────────────────────────────────
  async getWeather() {
    return get('/api/weather');
  },

  // ── Urban Health ─────────────────────────────
  async getUrbanHealth() {
    return get('/api/urban-health');
  },
  async getUrbanHealthHistory(hours = 24) {
    return get(`/api/urban-health/history?hours=${hours}`);
  },

  // ── Consequences ─────────────────────────────
  async getActiveConsequences() {
    return get('/api/consequences/active');
  },

  // ── Simulations ──────────────────────────────
  async runSimulation(scenario: string) {
    return post('/api/simulations', { scenario });
  },
  async getSimulation(id: number) {
    return get(`/api/simulations/${id}`);
  },
  async listSimulations(limit = 20) {
    return get(`/api/simulations?limit=${limit}`);
  },

  // ── Graph ────────────────────────────────────
  async getGraphStats() {
    return get('/api/graph/stats');
  },
  async getGraphNodes() {
    return get('/api/graph/nodes');
  },

  // ── Notifications ────────────────────────────
  async getNotifications(userId = 1, unreadOnly = false) {
    return get(`/api/notifications?user_id=${userId}&unread_only=${unreadOnly}`);
  },
  async markNotificationRead(id: number) {
    return post(`/api/notifications/${id}/read`);
  },

  // ── Insights / Model ─────────────────────────
  async generateInsights() {
    return get('/generate-insights');
  },
  async getModelMetrics() {
    return get('/model-metrics');
  },
  async getDecisionAssistant() {
    return get('/api/decision_assistant');
  },
  async getMemoryEngine(location: string) {
    return get(`/api/memory_engine?location=${encodeURIComponent(location)}`);
  },
  async getVulnerabilityScanner() {
    return get('/api/vulnerability_scanner');
  },
  async getCommandFeed() {
    return get('/api/command_feed');
  },
  async triggerAction(action: string, incident_id?: number, location?: string) {
    return post('/api/actions/trigger', { action, incident_id, location });
  },
  async getMissions() {
    return get('/api/missions');
  },
  async knowledgeSearch(q: string) {
    return get(`/api/knowledge_search?q=${encodeURIComponent(q)}`);
  },
  async explainPrediction(location?: string) {
    return get(location ? `/api/explain_prediction?location=${encodeURIComponent(location)}` : '/api/explain_prediction');
  },
  async getMemoryTimeline(location: string) {
    return get(`/api/memory_timeline?location=${encodeURIComponent(location)}`);
  },
  async generateAdvisory(type: string, location: string) {
    return post('/api/generate_advisory', { type, location });
  },
  async getResourceDeployment(location: string) {
    return get(`/api/resource_deployment?location=${encodeURIComponent(location)}`);
  },
  async impactCalculator(action: string, location: string) {
    return post('/api/impact_calculator', { action, location });
  },
  async getNewsroom() {
    return get('/api/newsroom');
  },

  // ── Chat ─────────────────────────────────────
  async chat(message: string) {
    return post('/api/chat', { message });
  },
};
