require("dotenv").config();
const express = require("express");
const path = require("path");

const invoiceRouter = require("./routes/invoice");

const app = express();
const basePort = Number(process.env.PORT) || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", invoiceRouter);

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Adaroch Invoice App en écoute sur http://localhost:${port}`);
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
