import { Router, type IRouter } from "express";
import {
  CreateBotBody,
  CreateBotResponse,
  DeleteBotParams,
  GetActivityResponse,
  GetBotsResponse,
  GetDashboardResponse,
  ToggleBotParams,
  ToggleBotResponse,
  UpdateBotBody,
  UpdateBotParams,
  UpdateBotResponse,
} from "@workspace/api-zod";
import { createProCheckoutSession } from "../lib/stripe";

type Bot = {
  id: string;
  name: string;
  title: string;
  description: string;
  source: "github" | "zip";
  sourceLabel: string;
  status: "online" | "offline" | "deploying";
  memoryMb: number;
  updatedAt: string;
  lastDeployedAt: string | null;
  uptime: string;
  monthlyUsage: number;
};

type Activity = {
  id: string;
  type: "deploy" | "status" | "edit" | "upload";
  title: string;
  detail: string;
  timestamp: string;
};

const now = () => new Date().toISOString();

const bots: Bot[] = [
  {
    id: "bot-echo",
    name: "echo-bot",
    title: "Echo Bot",
    description: "Responde mensagens e mantém seu servidor organizado.",
    source: "github",
    sourceLabel: "github.com/hollow/echo-bot",
    status: "online",
    memoryMb: 168,
    updatedAt: "há 12 min",
    lastDeployedAt: "2026-09-21T13:38:00.000Z",
    uptime: "99.98%",
    monthlyUsage: 142,
  },
  {
    id: "bot-moderator",
    name: "mod-guardian",
    title: "Mod Guardian",
    description: "Moderação automática com comandos simples para a equipe.",
    source: "zip",
    sourceLabel: "mod-guardian-v2.zip",
    status: "online",
    memoryMb: 212,
    updatedAt: "há 1 h",
    lastDeployedAt: "2026-09-21T12:50:00.000Z",
    uptime: "99.94%",
    monthlyUsage: 198,
  },
  {
    id: "bot-music",
    name: "nightwave",
    title: "Nightwave",
    description: "Fila de música minimalista para noites longas.",
    source: "github",
    sourceLabel: "github.com/hollow/nightwave",
    status: "offline",
    memoryMb: 96,
    updatedAt: "ontem",
    lastDeployedAt: "2026-09-20T19:05:00.000Z",
    uptime: "98.70%",
    monthlyUsage: 74,
  },
];

const activity: Activity[] = [
  {
    id: "activity-1",
    type: "deploy",
    title: "Echo Bot foi atualizado",
    detail: "Deploy concluído a partir do GitHub",
    timestamp: "há 12 min",
  },
  {
    id: "activity-2",
    type: "status",
    title: "Nightwave ficou offline",
    detail: "Você pausou o bot manualmente",
    timestamp: "ontem",
  },
  {
    id: "activity-3",
    type: "upload",
    title: "Mod Guardian foi adicionado",
    detail: "mod-guardian-v2.zip",
    timestamp: "ontem",
  },
];

const router: IRouter = Router();

router.get("/dashboard", (_req, res) => {
  const onlineBots = bots.filter((bot) => bot.status === "online").length;
  const data = GetDashboardResponse.parse({
    onlineBots,
    totalBots: bots.length,
    maxBots: 3,
    memoryUsedMb: bots.reduce((total, bot) => total + bot.memoryMb, 0),
    memoryLimitMb: 524,
    monthlyHours: 412,
    planName: "Free",
    uptimePercent: 99.96,
  });
  res.json(data);
});

router.get("/bots", (_req, res) => {
  res.json(GetBotsResponse.parse(bots));
});

router.post("/bots", (req, res) => {
  const input = CreateBotBody.parse(req.body);
  const bot: Bot = {
    id: `bot-${Date.now()}`,
    name: input.name,
    title: input.title,
    description: input.description,
    source: input.source,
    sourceLabel: input.sourceLabel ?? (input.source === "github" ? "Repositório conectado" : "Arquivo enviado"),
    status: "online",
    memoryMb: input.memoryMb ?? 64,
    updatedAt: "agora",
    lastDeployedAt: now(),
    uptime: "—",
    monthlyUsage: 0,
  };
  bots.unshift(bot);
  activity.unshift({
    id: `activity-${Date.now()}`,
    type: "upload",
    title: `${bot.title} foi adicionado`,
    detail: bot.sourceLabel,
    timestamp: "agora",
  });
  res.status(201).json(CreateBotResponse.parse(bot));
});

router.patch("/bots/:id", (req, res) => {
  const params = UpdateBotParams.parse(req.params);
  const input = UpdateBotBody.parse(req.body);
  const bot = bots.find((item) => item.id === params.id);
  if (!bot) {
    res.status(404).json({ error: "Bot não encontrado" });
    return;
  }

  Object.assign(bot, input, { updatedAt: "agora" });
  activity.unshift({
    id: `activity-${Date.now()}`,
    type: "edit",
    title: `${bot.title} foi editado`,
    detail: "Configurações salvas",
    timestamp: "agora",
  });
  res.json(UpdateBotResponse.parse(bot));
});

router.delete("/bots/:id", (req, res) => {
  const params = DeleteBotParams.parse(req.params);
  const index = bots.findIndex((item) => item.id === params.id);
  if (index < 0) {
    res.status(404).json({ error: "Bot não encontrado" });
    return;
  }
  bots.splice(index, 1);
  res.status(204).send();
});

router.post("/bots/:id/toggle", (req, res) => {
  const params = ToggleBotParams.parse(req.params);
  const bot = bots.find((item) => item.id === params.id);
  if (!bot) {
    res.status(404).json({ error: "Bot não encontrado" });
    return;
  }
  bot.status = bot.status === "online" ? "offline" : "online";
  bot.updatedAt = "agora";
  activity.unshift({
    id: `activity-${Date.now()}`,
    type: "status",
    title: `${bot.title} ficou ${bot.status === "online" ? "online" : "offline"}`,
    detail: bot.status === "online" ? "O bot está aceitando conexões" : "O bot foi pausado manualmente",
    timestamp: "agora",
  });
  res.json(ToggleBotResponse.parse(bot));
});

router.get("/activity", (_req, res) => {
  res.json(GetActivityResponse.parse(activity.slice(0, 8)));
});

router.post("/billing/pro-checkout", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Informe um e-mail válido" });
    return;
  }

  const configuredDomain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  const requestOrigin = req.get("origin");
  const origin = requestOrigin || (configuredDomain ? `https://${configuredDomain}` : "");
  if (!origin) {
    res.status(502).json({ error: "Checkout origin is not configured" });
    return;
  }

  try {
    const checkout = await createProCheckoutSession({ email, origin });
    res.json(checkout);
  } catch (error) {
    req.log.error({ err: error }, "Stripe checkout creation failed");
    res.status(502).json({ error: "Não foi possível abrir o checkout agora" });
  }
});

export default router;