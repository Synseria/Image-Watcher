import { Router } from "express";
import imageWatcherController from "./v1/image-watcher.controller";

/** Création du router pour ce module */
const router = Router();

/** Définition des routes pour le module image-watcher */
router.use("/v1/image-watcher", imageWatcherController);

/** Export du router */
export default router;

