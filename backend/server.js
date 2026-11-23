const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const EventEmitter = require('events');
require('dotenv').config();

const app = express();
const events = new EventEmitter();
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const LOG_FILE = process.env.ACTIVITY_FILE || path.join(__dirname, 'activity.log');
const allowedOrigins = (process.env.FRONTEND_ORIGIN || '').split(',').map(v => v.trim()).filter(Boolean);

app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('This website origin is not allowed by CORS.'));
} }));
app.use(express.json({ limit: '30kb' }));

// Read the JSON file on every operation so it remains the source of truth.
function readAssignments() {
  try {
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]\n', 'utf8');
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    const records = JSON.parse(content || '[]');
    if (!Array.isArray(records)) throw new Error('data.json must contain a JSON array.');
    return records;
  } catch (error) {
    if (error instanceof SyntaxError) error.message = `Could not parse ${DATA_FILE}: ${error.message}`;
    throw error;
  }
}

function writeAssignments(records) {
  const folder = path.dirname(DATA_FILE);
  fs.mkdirSync(folder, { recursive: true });
  const temporaryFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryFile, DATA_FILE);
}

function logActivity(action, assignment) {
  const entry = `${new Date().toISOString()} ${action} id=${assignment.id} title=${JSON.stringify(assignment.title)}\n`;
  try { fs.appendFileSync(LOG_FILE, entry, 'utf8'); }
  catch (error) { console.error('Activity log could not be written:', error.message); }
}
['assignment:created', 'assignment:updated', 'assignment:deleted'].forEach(eventName => {
  events.on(eventName, assignment => logActivity(eventName, assignment));
});

function validate(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return ['Request body must be a JSON object.'];
  if (typeof body.title !== 'string' || !body.title.trim()) errors.push('Title is required.');
  if (typeof body.subject !== 'string' || !body.subject.trim()) errors.push('Subject is required.');
  if (typeof body.description !== 'string') errors.push('Description must be text.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.submissionDate || '') || Number.isNaN(Date.parse(`${body.submissionDate}T00:00:00`))) errors.push('Submission date must be a valid YYYY-MM-DD date.');
  if (!['Low', 'Medium', 'High'].includes(body.priority)) errors.push('Priority must be Low, Medium, or High.');
  if (!['Pending', 'Completed'].includes(body.status)) errors.push('Status must be Pending or Completed.');
  return errors;
}

function parseRequestUrl(req) {
  return new URL(req.originalUrl, `http://${req.headers.host || 'localhost'}`);
}

app.get('/api/health', (req, res) => res.json({ ok: true, storage: DATA_FILE }));

app.get('/api/assignments', (req, res, next) => {
  try {
    const requestUrl = parseRequestUrl(req); // Node URL parses the request and its query parameters.
    const query = requestUrl.searchParams.get('q');
    const status = requestUrl.searchParams.get('status');
    let records = readAssignments();
    if (query) {
      const term = query.toLocaleLowerCase();
      records = records.filter(item => item.title.toLocaleLowerCase().includes(term) || item.subject.toLocaleLowerCase().includes(term));
    }
    if (status && status !== 'All') records = records.filter(item => item.status === status);
    res.json({ assignments: records });
  } catch (error) { next(error); }
});

app.get('/api/assignments/:id', (req, res, next) => {
  try {
    const assignment = readAssignments().find(item => item.id === req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });
    return res.json({ assignment });
  } catch (error) { return next(error); }
});

app.post('/api/assignments', (req, res, next) => {
  try {
    const errors = validate(req.body);
    if (errors.length) return res.status(400).json({ error: 'Please correct the assignment details.', details: errors });
    const now = new Date().toISOString();
    const assignment = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      title: req.body.title.trim(), subject: req.body.subject.trim(), description: req.body.description.trim(),
      submissionDate: req.body.submissionDate, priority: req.body.priority, status: req.body.status, createdDate: now
    };
    const records = readAssignments(); records.push(assignment); writeAssignments(records);
    events.emit('assignment:created', assignment);
    return res.status(201).json({ assignment });
  } catch (error) { return next(error); }
});

app.put('/api/assignments/:id', (req, res, next) => {
  try {
    const errors = validate(req.body);
    if (errors.length) return res.status(400).json({ error: 'Please correct the assignment details.', details: errors });
    const records = readAssignments(); const index = records.findIndex(item => item.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'Assignment not found.' });
    const updated = { ...records[index], title: req.body.title.trim(), subject: req.body.subject.trim(), description: req.body.description.trim(), submissionDate: req.body.submissionDate, priority: req.body.priority, status: req.body.status };
    records[index] = updated; writeAssignments(records); events.emit('assignment:updated', updated);
    return res.json({ assignment: updated });
  } catch (error) { return next(error); }
});

app.patch('/api/assignments/:id/status', (req, res, next) => {
  try {
    if (!req.body || !['Pending', 'Completed'].includes(req.body.status)) return res.status(400).json({ error: 'Status must be Pending or Completed.' });
    const records = readAssignments(); const assignment = records.find(item => item.id === req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });
    assignment.status = req.body.status; writeAssignments(records); events.emit('assignment:updated', assignment);
    return res.json({ assignment });
  } catch (error) { return next(error); }
});

app.delete('/api/assignments/:id', (req, res, next) => {
  try {
    const records = readAssignments(); const index = records.findIndex(item => item.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'Assignment not found.' });
    const [deleted] = records.splice(index, 1); writeAssignments(records); events.emit('assignment:deleted', deleted);
    return res.json({ message: 'Assignment deleted.', assignment: deleted });
  } catch (error) { return next(error); }
});

// Serve the AngularJS page and API from the same Render web service.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use((error, req, res, next) => {
  console.error(error);
  const statusCode = error.type === 'entity.parse.failed' ? 400 : 500;
  res.status(statusCode).json({ error: statusCode === 400 ? 'Request body contains invalid JSON.' : 'The server could not complete the request.' });
});

app.listen(PORT, () => console.log(`Student Assignment Manager API listening on port ${PORT}; JSON store: ${DATA_FILE}`));
