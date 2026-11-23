# Student Assignment Manager

A small full-stack assignment tracker for a Web Technology practical. It uses AngularJS 1.x, Express, and Node.js File System. `backend/data.json` is the database: the backend reads it for each request and writes changes back to it. There is no external database.

## Folder structure

```text
student-assignment-manager/
├── .gitignore
├── README.md
├── backend/
│   ├── .env.example
│   ├── activity.log
│   ├── data.json
│   ├── package.json
│   └── server.js
└── frontend/
    ├── README.md
    ├── app.js
    ├── index.html
    └── style.css
```

## Files

- `frontend/index.html` contains the page, dashboard, assignment table, validated form, navigation, and iframe guide. It loads AngularJS 1.x from Google's CDN.
- `frontend/style.css` contains responsive layout and the CSS selector examples.
- `frontend/app.js` contains the AngularJS module/controller, `$http` API calls, form behavior, search, filtering, and counts.
- `backend/server.js` contains the Express server, REST routes, validation, URL parsing, EventEmitter, activity log, and JSON file operations.
- `backend/data.json` is the local assignment database. It starts as an empty JSON array.
- `backend/activity.log` receives timestamped create/update/delete events.
- `backend/package.json` lists the small backend dependencies and start command.
- `.gitignore` excludes dependencies, environment settings, and the runtime activity log.
- `backend/.env.example` documents optional local and production settings. Copy it to `.env` if you want to set them locally.

## Run locally

Requirements: Node.js 18 or newer and npm.

1. Open **Terminal 1** in the `student-assignment-manager/backend` folder and run:

   ```bash
   npm install
   npm start
   ```

   The API listens at `http://localhost:3000`. Keep this terminal open.

2. Open **Terminal 2** in the `student-assignment-manager/frontend` folder and run:

   ```bash
   npx serve . -l 5500
   ```

   If asked, allow npm to download `serve`. Open the local URL it prints (typically `http://localhost:5500`). You can also use VS Code Live Server. Do not open the HTML as a `file://` URL.

The frontend defaults to the same-origin API, which is useful when Express serves the page. For separate local servers, edit the first script in `frontend/index.html` to set `window.API_BASE_URL = 'http://localhost:3000';` before `app.js` loads, or use a local reverse proxy. For Vercel, set that value to the deployed Render API URL as described below.

## How it works

The AngularJS controller sends JSON requests with `$http`. Express validates each request and calls `readAssignments()` in `server.js`, which reads and parses `data.json`. For a change, the route updates a temporary JavaScript array, then `writeAssignments()` writes the complete array to a temporary file and renames it over `data.json`. That keeps the JSON file as the source of truth across backend restarts. Create/update/delete routes emit EventEmitter events; listeners append a timestamped line to `activity.log`.

The URL module parses the request URL and query string in the list endpoint. `GET /api/assignments?q=math&status=Pending` can filter on the backend. The UI also performs its live search and status filter in the AngularJS controller.

## REST API

All successful responses are JSON. Validation errors return `400`, missing records return `404`, creation returns `201`, and unexpected file/server errors return `500`.

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | Check server availability and show the configured JSON path. |
| `GET /api/assignments` | Fetch all records. Optional `q` and `status` query parameters filter them. |
| `GET /api/assignments/:id` | Fetch one record by unique ID. |
| `POST /api/assignments` | Create a record. Required: `title`, `subject`, `submissionDate` (`YYYY-MM-DD`), `priority` (`Low`, `Medium`, `High`) and `status` (`Pending`, `Completed`); `description` is text. |
| `PUT /api/assignments/:id` | Replace editable details for an existing record; uses the same fields as POST. |
| `PATCH /api/assignments/:id/status` | Change status with `{ "status": "Completed" }` or `{ "status": "Pending" }`. |
| `DELETE /api/assignments/:id` | Delete a record. |

Each record also has a server-generated unique `id` and ISO `createdDate`.

## Deployment

### Deploy the whole app on Render

The included `render.yaml` defines one Node web service. Express serves both the frontend files and `/api` routes from the same origin, so no CORS or frontend URL setting is needed.

1. Push the project to a Git repository that your Render account can access.
2. In Render, select **New → Blueprint**, connect that repository, and select this project's root folder. Render reads `render.yaml` and creates the web service.
3. The blueprint uses build command `cd backend && npm install`, start command `cd backend && npm start`, and `/api/health` for its health check.
4. Open the generated `https://YOUR-SERVICE.onrender.com` URL. The assignment UI loads there; `/api/health` checks the API.

The included blueprint selects the free web-service plan. Render documents that free web services do not support persistent disks; their filesystem is ephemeral, so JSON changes can be lost on restart or redeployment. For persistent file storage, switch to an eligible paid plan, attach a disk mounted at `/var/data`, and set `DATA_FILE=/var/data/data.json` plus `ACTIVITY_FILE=/var/data/activity.log`. Render's disk pricing is currently listed separately from compute. Review the current plan and disk price in Render before choosing that option. Without a disk, back up `data.json` externally and restore it when required. A local JSON file remains suitable for a single-process college project, not multi-instance production traffic.

### Optional split deployment: frontend on Vercel

If hosting the frontend separately, deploy `frontend` as a Vercel static site and set `window.API_BASE_URL = 'https://YOUR-RENDER-SERVICE.onrender.com';` in `frontend/index.html` before `app.js` loads. Then set Render's `FRONTEND_ORIGIN` to the exact Vercel origin. The single-service Render setup above is simpler for this project.

## HOW THIS PROJECT COVERS MY WEB TECHNOLOGY PRACTICAL ASSIGNMENTS

| Practical concept | Where to find it |
| --- | --- |
| HTML elements, links, lists, tables, forms | `frontend/index.html`: header navigation, table, labeled form, and list inside the iframe guide. |
| HTML iframe | `frontend/index.html`: `iframe#help` with an embedded quick guide using `srcdoc`. |
| CSS element/class/ID selectors, box model | `frontend/style.css`: `body`, `.panel`, `#help`, universal `box-sizing`. |
| CSS combinators and pseudo-classes | `frontend/style.css`: descendant selectors such as `.field input`; `nav a:hover`, `:focus`, and `button:active`. |
| JavaScript objects and arrays | `frontend/app.js`: form/assignment objects and arrays; `backend/server.js`: assignment objects and record arrays. |
| Events and event handling | `frontend/index.html` Angular event directives; `backend/server.js` EventEmitter listeners and emissions. |
| If/else, switch, loops | `frontend/app.js` `refreshView()` has a loop, if condition, and switch statement. |
| AngularJS directives | `frontend/index.html`: `ng-app`, `ng-controller`, `ng-repeat`, `ng-model`, `ng-if`, `ng-show`, `ng-class`, `ng-click`, `ng-change`, `ng-submit`, `ng-disabled`. |
| AngularJS form validation | `frontend/index.html`: named form, `required`, `maxlength`, `$touched`, `$invalid`, validation messages; `app.js` checks before save. |
| AngularJS HTTP integration | `frontend/app.js`: `$http.get/post/put/patch/delete` sends real requests to Express. |
| Node.js File System | `backend/server.js`: `readAssignments`, `writeAssignments`, `fs.appendFileSync`, directory/file error handling. |
| Node URL module | `backend/server.js`: `parseRequestUrl()` and `searchParams` in `GET /api/assignments`. |
| EventEmitter | `backend/server.js`: create/update/delete events append to `activity.log`. |
| Express REST API | `backend/server.js`: routes listed in the API table above. |

## Viva questions and simple answers

1. **What is the purpose of this project?** It helps students track assignments, due dates, priority, and completion status.
2. **What is the frontend built with?** HTML5, CSS3, vanilla JavaScript, and AngularJS 1.x.
3. **What does AngularJS do here?** It binds the form and table to data and sends API requests with `$http`.
4. **What is Express?** A Node.js framework for defining HTTP routes and middleware.
5. **Where are records stored?** In `backend/data.json` as a JSON array.
6. **Is the JavaScript array the database?** No. It is loaded temporarily; each mutation is written back to the JSON file.
7. **How does data persist locally?** The server reads and writes the same file on disk, so restarting Node does not clear it.
8. **What is JSON?** A text format for storing structured objects and arrays.
9. **What is CRUD?** Create, Read, Update, and Delete operations.
10. **Which route creates an assignment?** `POST /api/assignments`.
11. **Which route changes only status?** `PATCH /api/assignments/:id/status`.
12. **Why validate input on the server?** A client can be bypassed, so the backend must protect stored data too.
13. **What does HTTP 201 mean?** A resource was created successfully.
14. **What does HTTP 404 mean?** The requested assignment does not exist.
15. **What does CORS do?** It controls which browser origins may call the API.
16. **What does `process.env.PORT` do?** It lets the hosting platform choose the server port.
17. **Why use an ID?** It uniquely identifies an assignment even when titles match.
18. **What does EventEmitter demonstrate?** Node event-based programming; CRUD actions emit events for the activity log.
19. **What does the URL module do?** It parses request URLs and query parameters such as `q` and `status`.
20. **What does `ng-repeat` do?** It repeats a template for each assignment in an array.
21. **What does `ng-model` do?** It synchronizes an input with a JavaScript model value.
22. **What is AngularJS form validation used for?** It detects missing or invalid fields before submitting.
23. **Why is an iframe included?** It embeds a small in-page instruction section, demonstrating the HTML element.
24. **What happens if the JSON file is malformed?** Parsing fails; the error middleware returns a server error and logs it to the console.
25. **Is Render's ordinary filesystem permanent?** No. Without a persistent disk it is ephemeral and can be reset on replacement or redeployment.
26. **How can the Render JSON survive a restart?** Configure a mounted persistent disk and set `DATA_FILE` to a path on that disk.
27. **Can this simple JSON approach handle many concurrent users?** It is best for a small single-process learning app; it does not provide database locking or multi-instance coordination.
28. **How does the browser get fresh records after reload?** The controller calls `GET /api/assignments` when it starts.
