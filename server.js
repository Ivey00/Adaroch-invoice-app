require("dotenv").config();
const express = require("express");
const path = require("path");

const chatRouter = require("./routes/chat");
const invoiceRouter = require("./routes/invoice");

const app = express();
const basePort = Number(process.env.PORT) || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/chat", chatRouter);
app.use("/api", invoiceRouter);

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Adaroch Invoice App en écoute sur http://localhost:${port}`);
    if (!process.env.OPENAI_API_KEY) {
      console.warn(
        "⚠️  OPENAI_API_KEY n'est pas défini. Ajoutez-le dans un fichier .env (voir .env.example) avant d'utiliser l'assistant."
      );
    }
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`Port ${port} déjà utilisé, tentative sur le port ${port + 1}...`);
      server.close(() => startServer(port + 1));
    } else {
      throw err;
    }
  });
}

startServer(basePort);
