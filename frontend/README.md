# Frontend

Static AngularJS 1.x frontend. The page calls the Express backend with `$http`.

For local development, start the backend first, then serve this folder with `npx serve . -l 5500`. Configure `window.API_BASE_URL` in `index.html` before `app.js` if the API is on a different origin. For Vercel deployment, point it to the Render service origin.
