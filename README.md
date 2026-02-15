<!-- README.md (paste this into your README file on GitHub) -->

<h1>TN51 / TX42 WebSocket Relay</h1>

<p>
  This is a simple WebSocket relay server for:
</p>

<ul>
  <li>Tennessee 51</li>
  <li>Texas 42</li>
</ul>

<p>
  It is deployed on Render and used as a <strong>dumb relay</strong>
  (no game logic stored server-side).
</p>

<h2>Features</h2>

<ul>
  <li>5 Tennessee 51 rooms (max 6 players each)</li>
  <li>5 Texas 42 rooms (max 4 players each)</li>
  <li>Room-based routing</li>
  <li>No game state stored</li>
  <li>No rule validation (client handles all game logic)</li>
</ul>

<h2>Allowed Rooms</h2>

<h3>Tennessee 51</h3>
<ul>
  <li>Tn51room001</li>
  <li>Tn51room002</li>
  <li>Tn51room003</li>
  <li>Tn51room004</li>
  <li>Tn51room005</li>
</ul>

<h3>Texas 42</h3>
<ul>
  <li>Tx42room001</li>
  <li>Tx42room002</li>
  <li>Tx42room003</li>
  <li>Tx42room004</li>
  <li>Tx42room005</li>
</ul>

<h2>Deployment (Render)</h2>

<p>Hosted on Render as a Node Web Service.</p>

<p><strong>Build command:</strong><br>
  npm install
</p>

<p><strong>Start command:</strong><br>
  npm start
</p>

<h2>Health Check</h2>

<p>Visit:</p>
<p><code>/health</code></p>

<p>Should return:</p>
<p><code>ok</code></p>

<hr>

<p>
  After Render gives you your service URL, add it here:
</p>

<p><strong>WebSocket URL:</strong><br>
  <code>wss://your-service-name.onrender.com</code>
</p>
