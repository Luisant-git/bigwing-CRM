import { prisma } from "@bigwing/db";
import { ownDataFilter } from "../leads/service.js";

interface DateFilter {
  dateFrom?: string;
  dateTo?: string;
}

function dateWhere(f: DateFilter) {
  if (!f.dateFrom && !f.dateTo) return {};
  return {
    enquiryDate: {
      ...(f.dateFrom && { gte: new Date(f.dateFrom) }),
      ...(f.dateTo && { lte: new Date(f.dateTo) }),
    },
  };
}

const OPEN_STAGES = { notIn: ["DELIVERED_CLOSED", "LOST"] };

export class ReportService {
  // ─── Sales Dashboard KPIs ─────────────────────────────────────

  async dashboard(f: DateFilter, user?: any) {
    const base = { isDeleted: false, ...dateWhere(f), ...ownDataFilter(user) };
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const [
      totalEnquiries,
      invoiced,
      lost,
      active,
      today,
      overdue,
      upcoming,
      noFollowup,
      delivered,
      booked,
    ] = await Promise.all([
      prisma.lead.count({ where: base }),
      prisma.lead.count({ where: { ...base, stage: "INVOICED" } }),
      prisma.lead.count({ where: { ...base, stage: "LOST" } }),
      prisma.lead.count({
        where: { ...base, stage: OPEN_STAGES },
      }),
      prisma.lead.count({
        where: {
          ...base,
          stage: OPEN_STAGES,
          nextFollowupAt: { gte: todayStart, lt: todayEnd },
        },
      }),
      prisma.lead.count({
        where: {
          ...base,
          stage: OPEN_STAGES,
          nextFollowupAt: { lt: todayStart },
        },
      }),
      prisma.lead.count({
        where: {
          ...base,
          stage: OPEN_STAGES,
          nextFollowupAt: { gte: todayEnd },
        },
      }),
      prisma.lead.count({
        where: {
          ...base,
          stage: OPEN_STAGES,
          nextFollowupAt: null,
        },
      }),
      prisma.lead.count({ where: { ...base, stage: "DELIVERED_CLOSED" } }),
      prisma.lead.count({ where: { ...base, stage: "BOOKED" } }),
    ]);

    return {
      totalEnquiries,
      active,
      today,
      overdue,
      upcoming,
      noFollowup,
      booked,
      invoiced,
      delivered,
      lost,
    };
  }

  // ─── Funnel (stage-wise counts) ───────────────────────────────

  async funnel(f: DateFilter, user?: any) {
    const base = { isDeleted: false, ...dateWhere(f), ...ownDataFilter(user) };

    const groups = await prisma.lead.groupBy({
      by: ["stage"],
      where: base,
      _count: { id: true },
    });

    const stageOrder = [
      "NEW",
      "ENQUIRED",
      "NOT_REACHABLE",
      "TEST_RIDE_SCHEDULED",
      "TEST_RIDE_COMPLETED",
      "QUOTATION_SHARED",
      "BOOKED",
      "INVOICED",
      "DELIVERED_CLOSED",
      "LOST",
    ];

    const countMap = new Map(groups.map((g) => [g.stage, g._count.id]));

    return stageOrder.map((stage) => ({
      stage,
      count: countMap.get(stage) ?? 0,
    }));
  }

  // ─── Executive Performance ────────────────────────────────────

  async executive(f: DateFilter, user?: any) {
    const base = { isDeleted: false, ...dateWhere(f), ...ownDataFilter(user) };

    // Get all assigned users' lead stats
    const groups = await prisma.lead.groupBy({
      by: ["assignedTo", "stage"],
      where: { ...base, assignedTo: { not: null } },
      _count: { id: true },
    });

    // Aggregate per executive
    const execMap = new Map<
      string,
      { total: number; stages: Record<string, number>; userId: bigint }
    >();

    for (const g of groups) {
      const key = String(g.assignedTo);
      if (!execMap.has(key)) {
        execMap.set(key, {
          total: 0,
          stages: {},
          userId: g.assignedTo!,
        });
      }
      const exec = execMap.get(key)!;
      exec.total += g._count.id;
      exec.stages[g.stage] = (exec.stages[g.stage] ?? 0) + g._count.id;
    }

    // Load user names
    const userIds = [...execMap.values()].map((e) => e.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true },
    });
    const userNameMap = new Map(users.map((u) => [String(u.id), u.fullName]));

    return [...execMap.entries()].map(([id, data]) => ({
      executiveId: Number(id),
      executiveName: userNameMap.get(id) ?? "Unknown",
      totalLeads: data.total,
      ENQUIRED: (data.stages["ENQUIRED"] ?? 0) + (data.stages["TEST_RIDE_SCHEDULED"] ?? 0) + (data.stages["TEST_RIDE_COMPLETED"] ?? 0) + (data.stages["QUOTATION_SHARED"] ?? 0) + (data.stages["BOOKED"] ?? 0) + (data.stages["INVOICED"] ?? 0) + (data.stages["DELIVERED_CLOSED"] ?? 0),
      ENQUIREDPct: data.total > 0 ? Math.round(((data.total - (data.stages["NEW"] ?? 0) - (data.stages["NOT_REACHABLE"] ?? 0)) / data.total) * 100) : 0,
      testRides: (data.stages["TEST_RIDE_SCHEDULED"] ?? 0) + (data.stages["TEST_RIDE_COMPLETED"] ?? 0),
      bookings: data.stages["BOOKED"] ?? 0,
      invoiced: data.stages["INVOICED"] ?? 0,
      delivered: data.stages["DELIVERED_CLOSED"] ?? 0,
      lost: data.stages["LOST"] ?? 0,
    }));
  }

  // ─── Source Performance ───────────────────────────────────────

  async source(f: DateFilter, user?: any) {
    const base = { isDeleted: false, ...dateWhere(f), ...ownDataFilter(user) };

    const groups = await prisma.lead.groupBy({
      by: ["sourceId", "stage"],
      where: base,
      _count: { id: true },
    });

    // Aggregate per source
    const sourceAgg = new Map<
      string,
      { total: number; invoiced: number; lost: number; delivered: number; sourceId: bigint }
    >();

    for (const g of groups) {
      const key = String(g.sourceId);
      if (!sourceAgg.has(key)) {
        sourceAgg.set(key, {
          total: 0,
          invoiced: 0,
          lost: 0,
          delivered: 0,
          sourceId: g.sourceId,
        });
      }
      const s = sourceAgg.get(key)!;
      s.total += g._count.id;
      if (g.stage === "INVOICED") s.invoiced += g._count.id;
      if (g.stage === "DELIVERED_CLOSED") s.delivered += g._count.id;
      if (g.stage === "LOST") s.lost += g._count.id;
    }

    // Load source names
    const sourceIds = [...sourceAgg.values()].map((s) => s.sourceId);
    const sources = await prisma.enquirySource.findMany({
      where: { id: { in: sourceIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(sources.map((s) => [String(s.id), s.name]));

    return [...sourceAgg.entries()].map(([id, data]) => ({
      sourceId: Number(id),
      sourceName: nameMap.get(id) ?? "Unknown",
      totalEnquiries: data.total,
      invoiced: data.invoiced,
      delivered: data.delivered,
      lost: data.lost,
      conversionPct:
        data.total > 0
          ? Math.round(
              ((data.invoiced + data.delivered) / data.total) * 100
            )
          : 0,
    }));
  }

  // ─── Model Mix ────────────────────────────────────────────────

  async modelMix(f: DateFilter, user?: any) {
    const base = { isDeleted: false, modelId: { not: null }, ...dateWhere(f), ...ownDataFilter(user) };

    const groups = await prisma.lead.groupBy({
      by: ["modelId", "stage"],
      where: base,
      _count: { id: true },
    });

    const modelAgg = new Map<
      string,
      { total: number; invoiced: number; delivered: number; modelId: bigint }
    >();

    for (const g of groups) {
      const key = String(g.modelId);
      if (!modelAgg.has(key)) {
        modelAgg.set(key, {
          total: 0,
          invoiced: 0,
          delivered: 0,
          modelId: g.modelId!,
        });
      }
      const m = modelAgg.get(key)!;
      m.total += g._count.id;
      if (g.stage === "INVOICED") m.invoiced += g._count.id;
      if (g.stage === "DELIVERED_CLOSED") m.delivered += g._count.id;
    }

    const modelIds = [...modelAgg.values()].map((m) => m.modelId);
    const models = await prisma.vehicleModel.findMany({
      where: { id: { in: modelIds } },
      select: { id: true, name: true, segment: true },
    });
    const nameMap = new Map<string, { name: string; segment: string | null }>(
      models.map((m) => [String(m.id), { name: m.name, segment: m.segment }])
    );

    return [...modelAgg.entries()]
      .map(([id, data]) => ({
        modelId: Number(id),
        modelName: nameMap.get(id)?.name ?? "Unknown",
        segment: nameMap.get(id)?.segment,
        totalEnquiries: data.total,
        invoiced: data.invoiced,
        delivered: data.delivered,
      }))
      .sort((a, b) => b.totalEnquiries - a.totalEnquiries);
  }

  // ─── Referred Branch Count ────────────────────────────────────

  async referredBranch(f: DateFilter, user?: any) {
    const base = {
      isDeleted: false,
      referredFromBranch: { not: null },
      ...dateWhere(f),
      ...ownDataFilter(user),
    };

    const groups = await prisma.lead.groupBy({
      by: ["referredFromBranch"],
      where: base,
      _count: { id: true },
    });

    return groups
      .map((g) => ({
        branch: g.referredFromBranch!,
        count: g._count.id,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // ─── Lost Reason Analysis ────────────────────────────────────

  async lostReasons(f: DateFilter, user?: any) {
    const base = {
      isDeleted: false,
      stage: "LOST",
      closureReasonId: { not: null },
      ...dateWhere(f),
      ...ownDataFilter(user),
    };

    const groups = await prisma.lead.groupBy({
      by: ["closureReasonId"],
      where: base,
      _count: { id: true },
    });

    const reasonIds = groups.map((g) => g.closureReasonId!);
    const reasons = await prisma.closureReason.findMany({
      where: { id: { in: reasonIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(reasons.map((r) => [String(r.id), r.name]));

    return groups
      .map((g) => ({
        reasonId: Number(g.closureReasonId),
        reason: nameMap.get(String(g.closureReasonId)) ?? "Unknown",
        count: g._count.id,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // ─── Tele-caller Dashboard (source × stage matrix) ───────────

  async telecallerDashboard(f: DateFilter, user?: any) {
    const base = { isDeleted: false, channel: "TELE", ...dateWhere(f), ...ownDataFilter(user) };

    const groups = await prisma.lead.groupBy({
      by: ["sourceId", "stage"],
      where: base,
      _count: { id: true },
    });

    // Get all sources
    const sourceIds = [...new Set(groups.map((g) => g.sourceId))];
    const sources = await prisma.enquirySource.findMany({
      where: { id: { in: sourceIds } },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    });
    const nameMap = new Map<string, string>(sources.map((s) => [String(s.id), s.name]));

    // Build matrix: source → { stage → count }
    const matrix = new Map<string, { source: string; stages: Record<string, number>; total: number }>();

    for (const g of groups) {
      const key = String(g.sourceId);
      if (!matrix.has(key)) {
        matrix.set(key, {
          source: nameMap.get(key) ?? "Unknown",
          stages: {},
          total: 0,
        });
      }
      const entry = matrix.get(key)!;
      entry.stages[g.stage] = g._count.id;
      entry.total += g._count.id;
    }

    return [...matrix.values()].sort((a, b) => b.total - a.total);
  }
}

export const reportService = new ReportService();


