// Express application setup

import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import routes from "./routes";
import { errorHandler } from "./middleware";

dotenv.config();

const createApp = (): Express => {
  const app = express();

  app.use(helmet());

  app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use("/api", routes);

  app.use(errorHandler);

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: "Not found",
    });
  });

  return app;
};

export default createApp;