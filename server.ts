import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import * as admin from 'firebase-admin';
import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Initialize Firebase Admin if configuration exists
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      let serviceAccount: any = null;
      const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT.trim();

      // Attempt 1: direct JSON parse
      try {
        serviceAccount = JSON.parse(rawEnv);
      } catch {}

      // Attempt 2: base64 decode if string
      if (!serviceAccount) {
        try {
          const decoded = Buffer.from(rawEnv, 'base64').toString('utf-8');
          if (decoded.trim().startsWith('{')) {
            serviceAccount = JSON.parse(decoded);
          }
        } catch {}
      }

      // Attempt 3: unwrap wrapping quotes
      if (!serviceAccount && ((rawEnv.startsWith('"') && rawEnv.endsWith('"')) || (rawEnv.startsWith("'") && rawEnv.endsWith("'")))) {
        try {
          const inner = rawEnv.slice(1, -1);
          serviceAccount = JSON.parse(inner);
        } catch {}
      }

      // Attempt 4: replace unescaped newlines in JSON string
      if (!serviceAccount) {
        try {
          const fixedNewlines = rawEnv.replace(/\r?\n/g, '\\n');
          serviceAccount = JSON.parse(fixedNewlines);
        } catch {}
      }

      if (serviceAccount && typeof serviceAccount === 'object') {
        if (typeof serviceAccount.private_key === 'string') {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        if (admin.apps.length === 0) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
          console.log("Firebase Admin initialized successfully");
        }
      } else {
        console.warn("FIREBASE_SERVICE_ACCOUNT exists but could not be parsed as a valid JSON object.");
      }
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT not found.");
    }
  } catch (error) {
    console.warn("Firebase Admin setup warning:", error instanceof Error ? error.message : String(error));
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  const SHARED_PROD_FILE = path.join(process.cwd(), 'data', 'shared_production_entries.json');
  const SHARED_DELETED_FILE = path.join(process.cwd(), 'data', 'shared_deleted_ids.json');

  function readSharedDeleted(): Set<string> {
    try {
      if (fs.existsSync(SHARED_DELETED_FILE)) {
        const content = fs.readFileSync(SHARED_DELETED_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) return new Set(parsed);
        if (parsed && Array.isArray(parsed.deletedIds)) return new Set(parsed.deletedIds);
      }
    } catch (err) {
      console.warn("Erro ao ler shared_deleted_ids:", err);
    }
    return new Set<string>();
  }

  function writeSharedDeleted(idsSet: Set<string>): void {
    try {
      const dir = path.dirname(SHARED_DELETED_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SHARED_DELETED_FILE, JSON.stringify({
        updatedAt: new Date().toISOString(),
        count: idsSet.size,
        deletedIds: Array.from(idsSet)
      }, null, 2), 'utf-8');
    } catch (err) {
      console.warn("Erro ao gravar shared_deleted_ids:", err);
    }
  }

  function readSharedProduction(): any[] {
    try {
      if (fs.existsSync(SHARED_PROD_FILE)) {
        const content = fs.readFileSync(SHARED_PROD_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        let entries: any[] = [];
        if (Array.isArray(parsed)) entries = parsed;
        else if (parsed && Array.isArray(parsed.entries)) entries = parsed.entries;

        const deleted = readSharedDeleted();
        if (deleted.size > 0) {
          entries = entries.filter(e => !deleted.has(e.id));
        }
        return entries;
      }
    } catch (err) {
      console.warn("Erro ao ler shared_production_entries:", err);
    }
    return [];
  }

  function writeSharedProduction(entries: any[]): void {
    try {
      const deleted = readSharedDeleted();
      const filtered = entries.filter(e => !deleted.has(e.id));
      const dir = path.dirname(SHARED_PROD_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SHARED_PROD_FILE, JSON.stringify({
        version: 2,
        updatedAt: new Date().toISOString(),
        count: filtered.length,
        entries: filtered
      }, null, 2), 'utf-8');
    } catch (err) {
      console.warn("Erro ao gravar shared_production_entries:", err);
    }
  }

  function deduplicateEntriesServer(entries: any[]): any[] {
    const idMap = new Map<string, any>();
    const bizMap = new Map<string, any>();
    const deleted = readSharedDeleted();

    const sorted = [...entries].sort((a, b) => {
      const timeA = a.updatedAt || a.date || '';
      const timeB = b.updatedAt || b.date || '';
      return timeB.localeCompare(timeA) || String(b.id || '').localeCompare(String(a.id || ''));
    });

    for (const entry of sorted) {
      if (!entry || !entry.id || !entry.date) continue;
      if (deleted.has(entry.id)) continue;
      if (idMap.has(entry.id)) continue;

      const normDate = String(entry.date || '').trim();
      const normMachine = String(entry.machine || '').trim().toLowerCase();
      const normShift = String(entry.shift || '').trim().toLowerCase();
      const normOperator = String(entry.operator || '').trim().toUpperCase();

      const isSpecial = entry.isNoWorkDay || entry.isMaintenanceEntry;
      const bizKey = isSpecial ? `${normDate}_${normMachine}_${normShift}_${entry.id}` : `${normDate}_${normMachine}_${normShift}_${normOperator}`;

      if (bizMap.has(bizKey)) {
        continue;
      }

      idMap.set(entry.id, entry);
      bizMap.set(bizKey, entry);
    }

    return Array.from(idMap.values()).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }

  // Endpoint de Sincronização em Nuvem Servidor-Cliente (Garante consistência entre Celular, Desktop e IA Studio)
  app.get("/api/sync/production", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    const entries = readSharedProduction();
    const deleted = readSharedDeleted();
    res.json({
      status: "ok",
      count: entries.length,
      lastSyncTime: new Date().toISOString(),
      entries,
      deletedIds: Array.from(deleted)
    });
  });

  app.post("/api/sync/production", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    try {
      const incoming = Array.isArray(req.body?.entries) ? req.body.entries : [];
      const clientDeleted = Array.isArray(req.body?.deletedIds) ? req.body.deletedIds : [];
      
      const deletedSet = readSharedDeleted();
      if (clientDeleted.length > 0) {
        clientDeleted.forEach((id: string) => { if (id) deletedSet.add(String(id)); });
        writeSharedDeleted(deletedSet);
      }

      const current = readSharedProduction();
      const merged = deduplicateEntriesServer([...incoming, ...current]);
      writeSharedProduction(merged);

      res.json({
        status: "ok",
        count: merged.length,
        lastSyncTime: new Date().toISOString(),
        entries: merged,
        deletedIds: Array.from(deletedSet)
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erro ao sincronizar' });
    }
  });

  // Endpoint para registrar exclusão instantânea e sincronizar entre todos os aparelhos
  app.post("/api/sync/production/delete", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    try {
      const idsToDelete: string[] = Array.isArray(req.body?.ids) 
        ? req.body.ids 
        : (req.body?.id ? [req.body.id] : []);

      if (idsToDelete.length === 0) {
        return res.json({ status: "ok", message: "Nenhum ID para excluir" });
      }

      const deletedSet = readSharedDeleted();
      idsToDelete.forEach(id => deletedSet.add(String(id)));
      writeSharedDeleted(deletedSet);

      const current = readSharedProduction();
      const filtered = current.filter(e => !deletedSet.has(e.id));
      writeSharedProduction(filtered);

      res.json({
        status: "ok",
        deletedCount: idsToDelete.length,
        remainingCount: filtered.length,
        lastSyncTime: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erro ao registrar exclusão' });
    }
  });

  app.post("/api/extract-production", async (req, res) => {
    try {
      const { base64Image } = req.body;
      if (!base64Image) return res.status(400).json({ error: "Image is required" });

      const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
      const ai = getGeminiClient();
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg"
            }
          },
          "Extraia os dados de produção desta imagem. Retorne JSON."
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              operator: { type: Type.STRING },
              machine: { type: Type.STRING },
              shift: { type: Type.STRING },
              grossWeight: { type: Type.NUMBER },
              tara: { type: Type.NUMBER },
              netWeight: { type: Type.NUMBER },
              volumes: { type: Type.NUMBER },
              tubetes: { type: Type.NUMBER },
              ecoA: { type: Type.NUMBER },
              ecoBP: { type: Type.NUMBER },
              ecoBM: { type: Type.NUMBER },
              borraTotal: { type: Type.NUMBER },
              manutencaoMin: { type: Type.NUMBER },
              manutencaoMotivo: { type: Type.STRING },
              processoMin: { type: Type.NUMBER },
              processoMotivo: { type: Type.STRING },
              outrosMin: { type: Type.NUMBER },
              outrosMotivo: { type: Type.STRING },
            }
          }
        }
      });

      const text = response.text || "{}";
      res.json(JSON.parse(text));
    } catch (error) {
      console.error("Gemini extraction error:", error);
      res.status(500).json({ error: "Failed to extract production data" });
    }
  });


  app.post("/api/polish-cause", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Melhore o seguinte texto de descrição de uma causa/problema de manutenção industrial para torná-lo altamente profissional, claro, técnico e objetivo (em português brasileiro). Corrija ortografia e gramática, mantendo exatamente o mesmo sentido original.

Retorne APENAS o texto aprimorado final, sem explicações, sem introduções e sem aspas.

Texto original:
"${text}"`,
        config: {
          systemInstruction: "Você é um assistente especialista em manutenção industrial. Sua única função é reescrever descrições de falhas, problemas ou causas de manutenção fornecidas pelos operadores de forma profissional, clara, técnica e concisa em português brasileiro. Não adicione saudações, conclusões, comentários ou formatações extras. Retorne apenas o texto limpo."
        }
      });

      const polishedText = response.text?.trim() || text;
      res.json({ polishedText });
    } catch (error) {
      console.error("Gemini polish-cause error:", error);
      res.status(500).json({ error: "Failed to polish text" });
    }
  });

  app.post("/api/send-notification", async (req, res) => {
    const { token, title, body } = req.body;

    if (!token) {
       return res.status(400).json({ error: "Token is required" });
    }

    try {
      if (admin.apps.length > 0) {
        await admin.messaging().send({
          token,
          notification: {
            title,
            body,
          },
          data: {
            id: Math.random().toString(36).substring(7),
            title,
            body,
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              priority: 'high',
              visibility: 'public',
              channelId: 'high_importance_channel',
              color: '#1e3a8a',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                'content-available': 1,
                alert: {
                  title,
                  body
                }
              },
            },
          },
          webpush: {
            headers: {
              Urgency: 'high'
            },
            notification: {
              title,
              body,
              icon: 'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png',
              badge: 'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png',
              vibrate: [200, 100, 200, 100, 200],
              requireInteraction: true,
              silent: false,
              actions: [
                {
                  action: 'open',
                  title: 'Ver Produção'
                },
                {
                  action: 'dismiss',
                  title: 'Ignorar'
                }
              ]
            },
            fcmOptions: {
              link: '/'
            }
          }
        });
        res.json({ success: true });
      } else {
        // Fallback for when admin is not fully configured - log for debugging
        console.log("Push notification simulation:", { title, body });
        res.json({ success: true, simulated: true });
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
