import { Router } from "express";
import { handleMetaWebhook, verifyMetaWebhook } from "./controller.js";

export const webhookRoutes = Router();

// Define webhook endpoints
webhookRoutes.get("/meta", verifyMetaWebhook);
webhookRoutes.post("/meta", handleMetaWebhook);
