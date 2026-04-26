import { Router } from "express";
import translateRoutes from "./translate";
import batchTranslateRoutes from "./batch-translate";
import uploadRoutes from "./upload";
import jobsRoutes from "./jobs";
import healthRoutes from "./health";

const router = Router();

router.use("/translate", translateRoutes);
router.use("/batch-translate", batchTranslateRoutes);
router.use("/upload", uploadRoutes);
router.use("/jobs", jobsRoutes);
router.use("/health", healthRoutes);

router.get("/", (req, res) => {
  res.json({
    name: "Subtitle Translation Server",
    version: "1.0.0",
    endpoints: {
      translate: "/api/translate",
      batchTranslate: "/api/batch-translate",
      upload: "/api/upload",
      jobs: "/api/jobs",
      health: "/api/health",
    },
  });
});

export default router;