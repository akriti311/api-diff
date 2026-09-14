import { createApp } from "./app.js";

const port = Number(process.env.PORT) || 3001;

createApp().listen(port, "0.0.0.0", () => {
  console.log(`API Diff listening on http://0.0.0.0:${port}`);
});
