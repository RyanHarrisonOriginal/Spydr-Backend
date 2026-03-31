import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { requireAuthApi } from "./middleware/auth.js";
import { ontologyRouter } from "./routes/ontology.js";
import { nodeRouter } from "./routes/nodes.js";
import { nodeTypesRouter } from "./routes/node-types.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.use("/api", requireAuthApi);
app.use("/api/ontologies", nodeRouter);
app.use("/api/ontologies", ontologyRouter);
app.use("/api/node-types", nodeTypesRouter);

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
