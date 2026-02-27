import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import cookieSession from "cookie-session";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(
    cookieSession({
      name: "session",
      keys: ["reddit-magnet-secret"],
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: true,
      sameSite: "none",
    })
  );

  // Reddit OAuth Routes
  app.get("/api/auth/reddit/url", (req, res) => {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const redirectUri = `${process.env.APP_URL}/auth/reddit/callback`;
    
    if (!clientId) {
      return res.status(500).json({ error: "REDDIT_CLIENT_ID not configured" });
    }

    const state = Math.random().toString(36).substring(7);
    const scope = "submit identity read";
    const url = `https://www.reddit.com/api/v1/authorize?client_id=${clientId}&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&duration=temporary&scope=${scope}`;
    
    res.json({ url });
  });

  app.get("/auth/reddit/callback", async (req, res) => {
    const { code, error } = req.query;
    
    if (error) {
      return res.send(`<html><body><script>window.opener.postMessage({ type: 'REDDIT_AUTH_ERROR', error: '${error}' }, '*'); window.close();</script></body></html>`);
    }

    try {
      const clientId = process.env.REDDIT_CLIENT_ID;
      const clientSecret = process.env.REDDIT_CLIENT_SECRET;
      const redirectUri = `${process.env.APP_URL}/auth/reddit/callback`;

      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      
      const response = await axios.post(
        "https://www.reddit.com/api/v1/access_token",
        new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: redirectUri,
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const { access_token } = response.data;
      
      // Get user info to verify
      const userResponse = await axios.get("https://oauth.reddit.com/api/v1/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      // Store in session or just send back to client via postMessage
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'REDDIT_AUTH_SUCCESS', 
                  token: '${access_token}',
                  username: '${userResponse.data.name}'
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("Reddit OAuth Error:", err.response?.data || err.message);
      res.status(500).send("Authentication failed");
    }
  });

  // API to post comment
  app.post("/api/reddit/comment", async (req, res) => {
    const { token, url, text } = req.body;

    if (!token || !url || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // 1. Get the fullname (thing_id) from the URL
      const jsonUrl = url.endsWith("/") ? `${url.slice(0, -1)}.json` : `${url}.json`;
      const postData = await axios.get(jsonUrl);
      
      let thingId = "";
      
      // Check if the URL points to a specific comment
      // Reddit JSON for a single comment thread usually has the comment in the second array element
      if (postData.data[1] && postData.data[1].data.children.length > 0) {
        // The first child of the second array is usually the targeted comment
        thingId = postData.data[1].data.children[0].data.name;
      } else {
        // Fallback to the post itself
        thingId = postData.data[0].data.children[0].data.name;
      }

      // 2. Post the comment
      const response = await axios.post(
        "https://oauth.reddit.com/api/comment",
        new URLSearchParams({
          api_type: "json",
          text: text,
          thing_id: thingId,
        }).toString(),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (response.data.json.errors.length > 0) {
        return res.status(400).json({ error: response.data.json.errors[0][1] });
      }

      res.json({ success: true, data: response.data.json.data });
    } catch (err: any) {
      console.error("Reddit Post Error:", err.response?.data || err.message);
      res.status(500).json({ error: "Failed to post comment to Reddit" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
