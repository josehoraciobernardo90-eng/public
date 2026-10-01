import express from "express";
import path from "path";
import fs from "node:fs/promises";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { randomUUID } from "node:crypto";
import { isValidMozambiquePhone } from "./utils/mozambiquePhone";
import type { Announcement, AnnouncementCitizen, AnnouncementReactionKind, PinResetRequest } from "./types";

// Mock initial data - in a real app, this would be in a DB
let containers = [
  { id: 'CT-101', neighborhood: 'Central', avenue: 'Av. Brasil', block: 'Q-04', referencePoint: 'Mercado Popular', status: 'normal', reportCount: 0, latitude: -19.0667, longitude: 33.6500 },
  { id: 'CT-102', neighborhood: 'Jardins', avenue: 'Rua das Flores', block: 'Q-12', referencePoint: 'Escola Primária', status: 'alert', lastReportedAt: new Date().toISOString(), reportCount: 3, latitude: -19.0600, longitude: 33.6550 },
];

type PushRegistration = { contact: string; token: string };
type PushReporter = { id?: string; citizenName?: string; citizenContact?: string };

const PUSH_REGISTRATIONS_PATH = path.join(process.cwd(), "data", "push-registrations.json");
const ANNOUNCEMENTS_PATH = path.join(process.cwd(), "data", "announcements.json");
const ANNOUNCEMENT_TTL_MS = 24 * 60 * 60 * 1000;
const CENTRAL_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const PIN_RESET_TTL_MS = 10 * 60 * 1000;
const COLLECTION_THANK_YOU_MESSAGES = [
  "Obrigado, {name}! A sua denúncia ajudou a recolher o contentor {container}.",
  "{name}, o contentor {container} já foi recolhido. Agradecemos a sua colaboração!",
  "A coleta do contentor {container} foi concluída, {name}. Obrigado por avisar!",
  "A sua participação fez a diferença, {name}: o contentor {container} foi recolhido.",
  "{name}, a equipa recolheu o contentor {container} após a sua denúncia. Muito obrigado!",
  "Obrigado por contribuir, {name}. O contentor {container} já está limpo e recolhido.",
  "{name}, a sua colaboração ajudou a equipa a recolher o contentor {container}.",
  "Boa notícia, {name}: o contentor {container} foi recolhido. Obrigado pela denúncia!",
  "A equipa concluiu a coleta do contentor {container}, {name}. Agradecemos o seu cuidado!",
  "{name}, a sua comunicação foi importante. O contentor {container} já foi recolhido.",
  "Muito obrigado, {name}! A denúncia do contentor {container} contribuiu para a coleta."
];

let pushRegistrations: PushRegistration[] = [];
let announcements: Announcement[] = [];

const normalizeContact = (contact?: string) => (contact || "").replace(/\D/g, "");
const hashString = (value: string) => Array.from(value).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);

const persistPushRegistrations = async () => {
  await fs.mkdir(path.dirname(PUSH_REGISTRATIONS_PATH), { recursive: true });
  await fs.writeFile(PUSH_REGISTRATIONS_PATH, JSON.stringify(pushRegistrations, null, 2), "utf8");
};

const persistAnnouncements = async () => {
  await fs.mkdir(path.dirname(ANNOUNCEMENTS_PATH), { recursive: true });
  await fs.writeFile(ANNOUNCEMENTS_PATH, JSON.stringify(announcements, null, 2), "utf8");
};

const sendCollectionPushes = async (containerId: string, collectionId: string, reporters: PushReporter[]) => {
  const sentContacts = new Set<string>();
  const messages = reporters.flatMap((reporter, reporterIndex) => {
    const contact = normalizeContact(reporter.citizenContact);
    if (!contact || sentContacts.has(contact)) return [];
    sentContacts.add(contact);

    const devices = pushRegistrations.filter(registration => registration.contact === contact);
    if (!devices.length) return [];

    const name = reporter.citizenName?.trim() || "Munícipe";
    const templateIndex = (hashString(collectionId) + reporterIndex) % COLLECTION_THANK_YOU_MESSAGES.length;
    const body = COLLECTION_THANK_YOU_MESSAGES[templateIndex]
      .replace("{name}", name)
      .replace("{container}", containerId);

    return devices.map(device => ({
      to: device.token,
      title: `Obrigado, ${name}!`,
      body,
      sound: "default",
      priority: "high",
      ttl: 30,
      channelId: "collection-updates",
      data: { type: "collection-resolved", containerId, collectionId }
    }));
  });

  for (let index = 0; index < messages.length; index += 100) {
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(messages.slice(index, index + 100))
      });
      if (!response.ok) {
        console.error("Expo Push recusou o envio:", response.status, await response.text());
      }
    } catch (error) {
      console.error("Falha ao enviar notificações de coleta:", error);
    }
  }
};

async function startServer() {
  const app = express();
  app.use(express.json());

  try {
    const savedRegistrations = JSON.parse(await fs.readFile(PUSH_REGISTRATIONS_PATH, "utf8"));
    if (Array.isArray(savedRegistrations)) pushRegistrations = savedRegistrations;
  } catch (error) {}

  try {
    const savedAnnouncements = JSON.parse(await fs.readFile(ANNOUNCEMENTS_PATH, "utf8"));
    if (Array.isArray(savedAnnouncements)) {
      announcements = savedAnnouncements.filter(item => new Date(item.expiresAt).getTime() > Date.now());
    }
  } catch (error) {}

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code !== "EADDRINUSE") console.error("WebSocket server error:", error);
  });
  const centralSessions = new Map<string, number>();
  const operationalSockets = new WeakMap<WebSocket, number>();
  let pinResetRequests: PinResetRequest[] = [];
  const pinResetSockets = new Map<string, WebSocket>();
  const hasOperationalSession = (ws: WebSocket) => {
    const expiresAt = operationalSockets.get(ws);
    if (!expiresAt || expiresAt <= Date.now()) {
      operationalSockets.delete(ws);
      return false;
    }
    return true;
  };
  const broadcastPinResetRequests = () => {
    const update = JSON.stringify({ type: "SYNC_PIN_RESET_REQUESTS", data: pinResetRequests });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && hasOperationalSession(client)) client.send(update);
    });
  };
  const initialPort = Number(process.env.PORT) || 3000;
  const chooseAvailablePort = !process.env.PORT;

  const broadcastAnnouncements = async () => {
    announcements = announcements.filter(item => new Date(item.expiresAt).getTime() > Date.now());
    try {
      await persistAnnouncements();
    } catch (error) {
      console.error("Falha ao guardar anúncios:", error);
    }
    const update = JSON.stringify({ type: "SYNC_ANNOUNCEMENTS", data: announcements });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(update);
    });
  };

  const announcementExpiryTimer = setInterval(() => {
    const activeAnnouncements = announcements.filter(item => new Date(item.expiresAt).getTime() > Date.now());
    if (activeAnnouncements.length !== announcements.length) {
      announcements = activeAnnouncements;
      void broadcastAnnouncements();
    }
  }, 60_000);
  announcementExpiryTimer.unref();

  const pinResetExpiryTimer = setInterval(() => {
    const now = Date.now();
    pinResetRequests = pinResetRequests.filter(request => {
      if (new Date(request.expiresAt).getTime() > now) return true;
      const requester = pinResetSockets.get(request.id);
      requester?.send(JSON.stringify({ type: "PIN_RESET_REJECTED", data: { requestId: request.id, message: "O pedido expirou. Solicite novamente." } }));
      pinResetSockets.delete(request.id);
      return false;
    });
    broadcastPinResetRequests();
  }, 30_000);
  pinResetExpiryTimer.unref();

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/central/authenticate", (req, res) => {
    const expectedId = process.env.CENTRAL_ADMIN_ID || "CMgondola";
    const expectedPassword = process.env.CENTRAL_ADMIN_PASSWORD || "199451";
    if (String(req.body?.id || "") !== expectedId || String(req.body?.password || "") !== expectedPassword) {
      return res.status(401).json({ error: "Credenciais administrativas inválidas." });
    }

    const now = Date.now();
    centralSessions.forEach((expiresAt, token) => {
      if (expiresAt <= now) centralSessions.delete(token);
    });
    const token = randomUUID();
    centralSessions.set(token, now + CENTRAL_SESSION_TTL_MS);
    res.json({ token });
  });

  app.post("/api/push/register", async (req, res) => {
    const contact = normalizeContact(req.body?.contact);
    const token = String(req.body?.expoPushToken || "");
    if (!isValidMozambiquePhone(contact) || !/^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(token)) {
      return res.status(400).json({ error: "Invalid push registration" });
    }

    pushRegistrations = pushRegistrations.filter(registration => registration.token !== token);
    pushRegistrations.push({ contact, token });
    try {
      await persistPushRegistrations();
      res.json({ success: true });
    } catch (error) {
      console.error("Falha ao guardar o token de push:", error);
      res.status(500).json({ error: "Could not save push registration" });
    }
  });

  app.get("/api/containers", (req, res) => {
    res.json(containers);
  });

  app.post("/api/containers", (req, res) => {
    const newContainer = req.body;
    if (newContainer && newContainer.id) {
      const exists = containers.some(c => c.id === newContainer.id);
      if (!exists) {
        containers.push(newContainer);
        const broadcastData = JSON.stringify({ type: "CONTAINER_ADDED", data: newContainer });
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastData);
          }
        });
      }
      return res.json({ success: true, container: newContainer });
    }
    res.status(400).json({ error: "Invalid container" });
  });

  app.delete("/api/containers/:id", (req, res) => {
    const { id } = req.params;
    containers = containers.filter(c => c.id !== id);
    const broadcastData = JSON.stringify({ type: "CONTAINER_DELETED", data: id });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(broadcastData);
      }
    });
    res.json({ success: true, id });
  });

  // Server-side Gemini AI analysis endpoint
  app.post("/api/analyze", async (req, res) => {
    try {
      const { containers: containerList } = req.body || {};
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      
      if (!apiKey) {
        return res.json({ 
          analysis: "Análise inteligente municipal: 1. A maioria dos contentores encontra-se em estado regular. 2. Recomenda-se priorizar contentores com mais de 2 alertas no Bairro Central e Jardins. 3. Mensagem do Presidente Arlindo Cesario Ngozo: 'Com a união de todos os munícipes e operacionais, mantemos Gondola limpa, verde e próspera!'" 
        });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Analise os seguintes dados de coleta de resíduos do Município de Gondola:
        ${JSON.stringify(containerList || [], null, 2)}
        
        Por favor, forneça:
        1. Um resumo crítico da situação atual (quantos estão cheios, quais bairros estão mais críticos).
        2. Uma recomendação de rota prioritária para os caminhões de lixo.
        3. Uma mensagem motivacional curta para a equipe operacional em nome do Presidente Arlindo Cesario Ngozo.
        
        Responda em português, de forma executiva e direta.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return res.json({ analysis: response.text });
    } catch (error) {
      console.error("Erro ao consultar Gemini:", error);
      return res.json({ 
        analysis: "As rotas prioritárias foram atualizadas de acordo com o mapa de calor dos contentores em alerta. Bom trabalho à equipa de saneamento!" 
      });
    }
  });

  // WebSocket logic
  wss.on("connection", (ws) => {
    console.log("New client connected");
    
    // Send initial state
    ws.send(JSON.stringify({ type: "SYNC_CONTAINERS", data: containers }));
    ws.send(JSON.stringify({ type: "SYNC_ANNOUNCEMENTS", data: announcements }));

    ws.on("message", async (message) => {
      try {
        const payload = JSON.parse(message.toString());

        if (payload.type === "AUTH_CENTRAL") {
          const token = String(payload.data?.token || "");
          const expiresAt = centralSessions.get(token);
          if (expiresAt && expiresAt > Date.now()) {
            operationalSockets.set(ws, expiresAt);
            ws.send(JSON.stringify({ type: "CENTRAL_AUTHENTICATED" }));
            ws.send(JSON.stringify({ type: "SYNC_PIN_RESET_REQUESTS", data: pinResetRequests }));
          } else {
            ws.send(JSON.stringify({ type: "ANNOUNCEMENT_ERROR", message: "Sessão da central inválida. Entre novamente." }));
          }
          return;
        }

        if (payload.type === "DEAUTH_CENTRAL") {
          operationalSockets.delete(ws);
          return;
        }

        if (payload.type === "REQUEST_PIN_RESET") {
          const contact = normalizeContact(payload.data?.contact);
          if (!isValidMozambiquePhone(contact)) {
            ws.send(JSON.stringify({ type: "PIN_RESET_REJECTED", data: { message: "Informe um número nacional válido." } }));
            return;
          }
          const existingRequest = pinResetRequests.find(request => request.contact === contact && pinResetSockets.get(request.id) === ws);
          if (existingRequest) {
            ws.send(JSON.stringify({ type: "PIN_RESET_REQUESTED", data: existingRequest }));
            return;
          }
          const now = new Date();
          const request: PinResetRequest = {
            id: randomUUID(),
            contact,
            requestedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + PIN_RESET_TTL_MS).toISOString(),
            approved: false
          };
          pinResetRequests.push(request);
          pinResetSockets.set(request.id, ws);
          ws.send(JSON.stringify({ type: "PIN_RESET_REQUESTED", data: request }));
          broadcastPinResetRequests();
          return;
        }

        if (payload.type === "APPROVE_PIN_RESET" || payload.type === "REJECT_PIN_RESET") {
          if (!hasOperationalSession(ws)) {
            ws.send(JSON.stringify({ type: "ANNOUNCEMENT_ERROR", message: "Somente a central pode analisar pedidos de recuperação." }));
            return;
          }
          const request = pinResetRequests.find(item => item.id === payload.data?.requestId);
          if (!request || new Date(request.expiresAt).getTime() <= Date.now()) return;
          const requester = pinResetSockets.get(request.id);
          if (!requester || requester.readyState !== WebSocket.OPEN) return;

          if (payload.type === "APPROVE_PIN_RESET") {
            request.approved = true;
            requester.send(JSON.stringify({ type: "PIN_RESET_APPROVED", data: { requestId: request.id, contact: request.contact } }));
          } else {
            requester.send(JSON.stringify({ type: "PIN_RESET_REJECTED", data: { requestId: request.id, message: "A central não aprovou o pedido. Contacte o suporte municipal." } }));
            pinResetRequests = pinResetRequests.filter(item => item.id !== request.id);
            pinResetSockets.delete(request.id);
          }
          broadcastPinResetRequests();
          return;
        }

        if (payload.type === "COMPLETE_PIN_RESET") {
          const { requestId, pin } = payload.data || {};
          const request = pinResetRequests.find(item => item.id === requestId);
          if (!request || pinResetSockets.get(requestId) !== ws || !request.approved || new Date(request.expiresAt).getTime() <= Date.now()) {
            ws.send(JSON.stringify({ type: "PIN_RESET_REJECTED", data: { requestId, message: "Pedido inválido ou expirado. Solicite novamente." } }));
            return;
          }
          if (!/^\d{4}$/.test(String(pin || ""))) {
            ws.send(JSON.stringify({ type: "PIN_RESET_REJECTED", data: { requestId, message: "O novo PIN deve ter quatro dígitos." } }));
            return;
          }
          ws.send(JSON.stringify({ type: "PIN_RESET_COMPLETED", data: { requestId, contact: request.contact } }));
          pinResetRequests = pinResetRequests.filter(item => item.id !== requestId);
          pinResetSockets.delete(requestId);
          broadcastPinResetRequests();
          return;
        }
        
        if (payload.type === "UPDATE_CONTAINER") {
          const updatedContainer = payload.data;
          const previousContainer = containers.find(c => c.id === updatedContainer.id);
          const wasAlert = String(previousContainer?.status || "").toLowerCase() === "alert";
          const isCollected = String(updatedContainer.status || "").toLowerCase() === "normal";
          containers = containers.map(c => c.id === updatedContainer.id ? updatedContainer : c);
          
          // Broadcast to all clients
          const broadcastData = JSON.stringify({ type: "CONTAINER_UPDATED", data: updatedContainer });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });

          if (wasAlert && isCollected) {
            const latestCollection = updatedContainer.history?.[updatedContainer.history.length - 1];
            const reporters = latestCollection?.reporters?.length
              ? latestCollection.reporters
              : (previousContainer as { activeReports?: PushReporter[] } | undefined)?.activeReports || [];
            void sendCollectionPushes(updatedContainer.id, latestCollection?.id || `${updatedContainer.id}-${Date.now()}`, reporters);
          }
        }

        if (payload.type === "ADD_CONTAINER") {
          const newContainer = payload.data;
          containers.push(newContainer);
          
          // Broadcast to all clients
          const broadcastData = JSON.stringify({ type: "CONTAINER_ADDED", data: newContainer });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });
        }

        if (payload.type === "DELETE_CONTAINER") {
          const id = payload.data;
          containers = containers.filter(c => c.id !== id);
          
          // Broadcast to all clients
          const broadcastData = JSON.stringify({ type: "CONTAINER_DELETED", data: id });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });
        }

        if (payload.type === "CREATE_ANNOUNCEMENT") {
          if (!hasOperationalSession(ws)) {
            ws.send(JSON.stringify({ type: "ANNOUNCEMENT_ERROR", message: "Somente a central pode publicar anúncios." }));
            return;
          }
          const messageText = String(payload.data?.message || "").trim().slice(0, 1200);
          if (!messageText) return;
          const now = new Date();
          announcements.unshift({
            id: randomUUID(),
            message: messageText,
            author: "Central de Gondola",
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + ANNOUNCEMENT_TTL_MS).toISOString(),
            reactions: []
          });
          await broadcastAnnouncements();
        }

        if (payload.type === "UPDATE_ANNOUNCEMENT") {
          if (!hasOperationalSession(ws)) {
            ws.send(JSON.stringify({ type: "ANNOUNCEMENT_ERROR", message: "Somente a central pode editar anúncios." }));
            return;
          }
          const { id, message } = payload.data || {};
          const messageText = String(message || "").trim().slice(0, 1200);
          const announcement = announcements.find(item => item.id === id);
          if (!announcement || !messageText) return;
          announcement.message = messageText;
          announcement.updatedAt = new Date().toISOString();
          await broadcastAnnouncements();
        }

        if (payload.type === "DELETE_ANNOUNCEMENT") {
          if (!hasOperationalSession(ws)) {
            ws.send(JSON.stringify({ type: "ANNOUNCEMENT_ERROR", message: "Somente a central pode apagar anúncios." }));
            return;
          }
          announcements = announcements.filter(item => item.id !== payload.data?.id);
          await broadcastAnnouncements();
        }

        if (payload.type === "REACT_ANNOUNCEMENT") {
          const { announcementId, reaction, citizen: submittedCitizen } = payload.data || {};
          const contact = String(submittedCitizen?.contact || "").replace(/\D/g, "");
          const announcement = announcements.find(item => item.id === announcementId);
          if (!announcement || !isValidMozambiquePhone(contact)) return;
          if (reaction !== null && reaction !== "like" && reaction !== "dislike") return;

          announcement.reactions = announcement.reactions.filter(item => item.contact !== contact);
          if (reaction) {
            const citizen: AnnouncementCitizen = {
              name: String(submittedCitizen.name || "").trim().slice(0, 120),
              city: String(submittedCitizen.city || "Gondola").trim().slice(0, 80),
              neighborhood: String(submittedCitizen.neighborhood || "").trim().slice(0, 120),
              zone: String(submittedCitizen.zone || "").trim().slice(0, 80),
              contact
            };
            if (!citizen.name) return;
            announcement.reactions.push({
              contact,
              reaction: reaction as AnnouncementReactionKind,
              citizen,
              reactedAt: new Date().toISOString()
            });
          }
          await broadcastAnnouncements();
        }
      } catch (e) {
        console.error("Error processing message:", e);
      }
    });

    ws.on("close", () => {
      pinResetRequests = pinResetRequests.filter(request => {
        if (pinResetSockets.get(request.id) !== ws) return true;
        pinResetSockets.delete(request.id);
        return false;
      });
      broadcastPinResetRequests();
      console.log("Client disconnected");
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const listenOnPort = (port: number) => {
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (chooseAvailablePort && error.code === "EADDRINUSE" && port < 3100) {
        console.warn(`Port ${port} is busy; trying ${port + 1}.`);
        listenOnPort(port + 1);
        return;
      }
      console.error(`Could not start server on port ${port}:`, error);
      process.exitCode = 1;
    });
    server.listen(port, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  };

  listenOnPort(initialPort);
}

startServer();
