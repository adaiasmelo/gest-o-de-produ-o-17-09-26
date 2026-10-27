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
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Middleware para capturar erros de payload/JSON sem quebrar conexões
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      console.error("Express middleware error:", err?.message || err);
      return res.status(err.status || 400).json({
        success: false,
        error: err.message || "Erro no corpo da requisição"
      });
    }
    next();
  });

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

  app.post("/api/parse-cartao-ponto", async (req, res) => {
    try {
      const { base64Image, mimeType, selectedEmployeeName, selectedRegistration, selectedRole, selectedSector } = req.body;
      if (!base64Image) {
        return res.status(400).json({ error: "Imagem da folha de ponto é obrigatória" });
      }

      const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
      const finalMime = mimeType || "image/png";

      // Leitura via Inteligência Artificial Gemini multimodal
      let aiResult: any = null;
      try {
        if (process.env.GEMINI_API_KEY) {
          const ai = getGeminiClient();
          const collaboratorHint = selectedEmployeeName 
            ? `\nContexto: O operador selecionou no sistema o colaborador "${selectedEmployeeName}" (Matrícula: ${selectedRegistration || 'N/A'}, Cargo: ${selectedRole || 'N/A'}, Setor: ${selectedSector || 'N/A'}). Se o cabeçalho confirmar ou pertencer a este colaborador, utilize estes dados.`
            : '';

          const promptText = `Você é um auditor de Recursos Humanos industrial e perito em leitura documental OCR.
Analise com rigor absoluto este documento oficial de Folha de Ponto / Cartão Ponto industrial.

REGRA CRÍTICA MANDATÓRIA:
- Extraia os dados EXATAMENTE como estão impressos nesta imagem de documento.
- O colaborador pode ser qualquer profissional (ex: Auxiliar de Produção, Operador de Extrusora 1 ou 2, Rebobinador, Supervisor, Assistente, Mecânico, etc.).
- JAMAIS assuma ou invente nomes de exemplo (como "Adaías Melo") a menos que este nome específico esteja nitidamente impresso no cabeçalho desta folha.
- Se o documento pertencer a outro colaborador (qualquer Auxiliar, Operador, etc.), extraia o nome, matrícula e cargo DELE.${collaboratorHint}

1. DADOS CADASTRAIS DO CABEÇALHO:
- employeeName: Nome completo do empregado conforme impresso no documento
- registration: Matrícula funcional (número do empregado)
- role: Cargo oficial impresso
- sector: Setor de trabalho (ex: "Produção", "Extrusão", "Corte e Bobinamento")
- period: Período do cartão (ex: "25/09/2026 a 19/10/2026")
- contractSchedule: Horários contratuais informados no cartão
- employer: Nome da empresa empregadora

2. LISTA COMPLETA DE HORAS EXTRAS (overtimeEvents):
Percorra linha a linha toda a tabela de dias do período. Para CADA dia onde houver registro de Horas Extras (seja nas colunas 'Ext 60%', 'Ext 110%', 'Ext 120%', 'Interj', ou no texto da coluna 'Marcações' indicando 'Horas Extras'):
- date: data no formato YYYY-MM-DD (considere o ano informado no período do cabeçalho).
- dayOfWeek: dia da semana abreviado ("DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB").
- isSaturday: se o dia for Sábado.
- isSunday: se o dia for Domingo.
- isHoliday: se o dia for feriado.
- holidayName: nome do feriado, se houver.
- startTime: primeiro horário registrado de entrada no dia (ex: "07:32", "06:30").
- endTime: último horário registrado de saída no dia (ex: "18:20", "19:39").
- overtimeMode: se for sábado, domingo ou folga onde toda a permanência no local foi hora extra, preencha "integral". Se for dia normal de trabalho com cumprimento de expediente e extensão de horário, preencha "pos_turno".
- shiftTypeChoice: "Comercial", "Diurno" ou "Noturno" baseado nos horários e turno.
- overtimeHoursRaw: texto com o tempo de horas extras da coluna (ex: "00:48", "01:56", "03:27").
- overtimeHoursDecimal: número decimal de horas extras (ex: 00:48 = 0.8; 01:56 = 1.93; 03:27 = 3.45).
- overtimeHoursFormatted: formato amigável (ex: "0h 48min", "1h 56min", "3h 27min").
- overtimePercentage: número 60 para dias de segunda a sábado, 110 para domingos/feriados ou 120 para 120%.
- workingHoursRaw: horas trabalhadas da coluna Trabalho (ex: "08:48").
- workingHoursDecimal: número decimal de permanência total.
- isNightShift: se houver adicional noturno.
- markingsText: texto completo das marcações daquele dia.
- reason: DEIXAR OBRIGATORIAMENTE EM BRANCO "" (o usuário irá preencher o motivo e a atividade realizada).
- notes: breve nota extraída do cartão.

Retorne em formato JSON estrito.`;

          const geminiCall = ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: finalMime
                }
              },
              promptText
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  employeeName: { type: Type.STRING },
                  registration: { type: Type.STRING },
                  role: { type: Type.STRING },
                  sector: { type: Type.STRING },
                  period: { type: Type.STRING },
                  contractSchedule: { type: Type.STRING },
                  employer: { type: Type.STRING },
                  totalOvertimeHoursSum: { type: Type.STRING },
                  overtimeEvents: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        date: { type: Type.STRING },
                        dayOfWeek: { type: Type.STRING },
                        isSaturday: { type: Type.BOOLEAN },
                        isSunday: { type: Type.BOOLEAN },
                        isHoliday: { type: Type.BOOLEAN },
                        holidayName: { type: Type.STRING },
                        overtimeMode: { type: Type.STRING },
                        shiftTypeChoice: { type: Type.STRING },
                        startTime: { type: Type.STRING },
                        endTime: { type: Type.STRING },
                        overtimeHoursRaw: { type: Type.STRING },
                        overtimeHoursDecimal: { type: Type.NUMBER },
                        overtimeHoursFormatted: { type: Type.STRING },
                        overtimePercentage: { type: Type.NUMBER },
                        workingHoursRaw: { type: Type.STRING },
                        workingHoursDecimal: { type: Type.NUMBER },
                        isNightShift: { type: Type.BOOLEAN },
                        markingsText: { type: Type.STRING },
                        reason: { type: Type.STRING },
                        notes: { type: Type.STRING }
                      },
                      required: ["date", "startTime", "endTime", "overtimeHoursDecimal", "overtimePercentage", "overtimeMode"]
                    }
                  }
                },
                required: ["employeeName", "registration", "overtimeEvents"]
              }
            }
          });

          const timeoutCall = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout ao processar imagem")), 35000)
          );
          const response = await Promise.race([geminiCall, timeoutCall]);

          if (response?.text) {
            aiResult = JSON.parse(response.text);
          }
        }
      } catch (geminiError: any) {
        console.warn("Processamento Gemini retornou exceção:", geminiError?.message);
      }

      // Se a IA do Gemini retornou os dados da folha com sucesso
      if (aiResult && aiResult.employeeName) {
        // Se o usuário já havia selecionado um colaborador específico e a IA não identificou com precisão
        if (selectedEmployeeName && (!aiResult.employeeName || aiResult.employeeName === 'Colaborador')) {
          aiResult.employeeName = selectedEmployeeName;
          if (selectedRegistration) aiResult.registration = selectedRegistration;
          if (selectedRole) aiResult.role = selectedRole;
          if (selectedSector) aiResult.sector = selectedSector;
        }

        res.setHeader('Content-Type', 'application/json');
        return res.json({ success: true, source: "gemini", data: aiResult });
      }

      // Se a IA não conseguiu extrair ou deu timeout, mas o usuário selecionou o colaborador:
      if (selectedEmployeeName) {
        res.setHeader('Content-Type', 'application/json');
        return res.json({
          success: true,
          source: "user-confirmed",
          data: {
            employeeName: selectedEmployeeName,
            registration: selectedRegistration || "",
            role: selectedRole || "",
            sector: selectedSector || "Produção",
            period: "",
            contractSchedule: "",
            employer: "MANUPACKAGING DA AMAZONIA INDUSTRIA DE EMBALAGENS",
            overtimeEvents: []
          }
        });
      }

      // Sem fallback fixo forçado de Adaías Melo: informa ao usuário para selecionar o colaborador
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        success: false,
        error: "A IA não conseguiu ler automaticamente o nome do colaborador na folha. Por favor, selecione o colaborador no campo acima e confirme os horários.",
        data: null
      });
    } catch (error: any) {
      console.error("Erro geral no endpoint /api/parse-cartao-ponto:", error);
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ success: false, error: error?.message || "Erro ao processar imagem de ponto" });
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
