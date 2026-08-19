import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { authMiddleware } from '../middlewares/auth';
import { ApiResponse } from '../../../shared/types';

const router = Router();

type RankTier = '青铜' | '白银' | '黄金' | '白金' | '翡翠' | '钻石' | '大师' | '宗师' | '英杰' | '未定级';
type AuctionViewer = 'admin' | 'captain';

interface CaptainPayload {
  type: 'auction_captain';
  tenantId: string;
  sessionId: number;
  teamId: number;
}

interface RegistrationPlayer {
  id: number;
  battleTag: string;
  nickname: string;
  wechatGroup: string;
  primaryRoles: string[];
  secondaryRoles: string[];
  selfRanks: Record<string, string>;
  primaryRole: string;
  primaryRoleLabel: string;
  primaryRank: string;
  captainTier: RankTier;
}

const rankTiers: RankTier[] = ['青铜', '白银', '黄金', '白金', '翡翠', '钻石', '大师', '宗师', '英杰'];
const rankOrder = new Map<RankTier, number>(rankTiers.map((tier, index) => [tier, index]));
const roleLabels: Record<string, string> = {
  tank: '重装',
  damage: '输出',
  support: '支援'
};

const jsonOk = <T>(res: Response, message: string, data: T) => {
  const response: ApiResponse<T> = { success: true, code: 200, message, data };
  return res.status(200).json(response);
};

const jsonError = (res: Response, status: number, message: string) => {
  const response: ApiResponse = { success: false, code: status, message, data: null };
  return res.status(status).json(response);
};

const parseJson = <T>(value: any, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const toArray = (value: any): string[] => {
  const parsed = parseJson<any[]>(value, []);
  return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
};

const toRanks = (value: any): Record<string, string> => {
  const parsed = parseJson<Record<string, string>>(value, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
};

const normalizeTeamCount = (value: any, fallback: number, totalPlayers: number): number => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  const count = Number.isFinite(parsed) ? parsed : fallback;
  const max = Math.max(2, totalPlayers);
  return Math.min(Math.max(count, 2), max);
};

const getSuggestedTeamCount = (totalPlayers: number): number => {
  return Math.max(2, Math.ceil(totalPlayers / 5));
};

const getInitialBudget = (teamCount: number): number => {
  return Math.max(1, Math.round(360 / Math.max(teamCount, 1)));
};

const extractTier = (rank: string | undefined): RankTier => {
  if (!rank || rank === '未定级') return '未定级';
  const match = rank.match(/^(青铜|白银|黄金|白金|翡翠|钻石|大师|宗师|英杰)/);
  return (match?.[1] as RankTier | undefined) || '未定级';
};

const getBestTier = (selfRanks: Record<string, string>): RankTier => {
  let best: RankTier = '未定级';
  Object.values(selfRanks).forEach(rank => {
    const tier = extractTier(rank);
    if (tier === '未定级') return;
    const currentScore = rankOrder.get(best) ?? -1;
    const nextScore = rankOrder.get(tier) ?? -1;
    if (nextScore > currentScore) best = tier;
  });
  return best;
};

const getRegistrationPlayer = (row: any): RegistrationPlayer => {
  const primaryRoles = toArray(row.primary_roles ?? row.primaryRoles);
  const secondaryRoles = toArray(row.secondary_roles ?? row.secondaryRoles);
  const selfRanks = toRanks(row.self_ranks ?? row.selfRanks);
  const primaryRole = primaryRoles[0] || secondaryRoles[0] || '';
  const battleTag = String(row.battle_tag ?? row.battleTag ?? '');
  return {
    id: Number(row.id),
    battleTag,
    nickname: battleTag.split('#')[0] || battleTag || '未知玩家',
    wechatGroup: String(row.wechat_group ?? row.wechatGroup ?? ''),
    primaryRoles,
    secondaryRoles,
    selfRanks,
    primaryRole,
    primaryRoleLabel: roleLabels[primaryRole] || primaryRole || '未填写',
    primaryRank: primaryRole ? (selfRanks[primaryRole] || '未定级') : '未定级',
    captainTier: getBestTier(selfRanks)
  };
};

const getRegistrations = async (tenantId: string): Promise<RegistrationPlayer[]> => {
  const result = await pool.query(
    'SELECT id, battle_tag, wechat_group, primary_roles, secondary_roles, self_ranks FROM registrations WHERE tenant_id = $1 ORDER BY created_at ASC',
    [tenantId]
  );
  return result.rows.map(getRegistrationPlayer);
};

const buildRankOptions = (registrations: RegistrationPlayer[], teamCount: number) => {
  const counts = new Map<RankTier, number>();
  rankTiers.forEach(tier => counts.set(tier, 0));
  registrations.forEach(player => {
    if (player.captainTier !== '未定级') {
      counts.set(player.captainTier, (counts.get(player.captainTier) || 0) + 1);
    }
  });
  return [...rankTiers].reverse().map(tier => {
    const count = counts.get(tier) || 0;
    return {
      tier,
      count,
      eligible: count >= teamCount
    };
  });
};

const shuffle = <T>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = result[i];
    const next = result[j];
    if (current !== undefined && next !== undefined) {
      result[i] = next;
      result[j] = current;
    }
  }
  return result;
};

const generateCaptainCode = () => {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
};

const serializePlayer = (player: any, viewer: AuctionViewer, anonymousMode: boolean, area: 'current' | 'pool' | 'team') => {
  const shouldMaskForDisplay = anonymousMode && (area === 'current' || area === 'pool');
  const shouldHideIdentity = viewer === 'captain' && shouldMaskForDisplay;
  const shouldHideDetails = viewer === 'captain' && anonymousMode && area === 'pool';
  return {
    id: player.id,
    registrationId: player.registrationId ?? player.id,
    battleTag: shouldHideIdentity ? null : player.battleTag,
    nickname: shouldHideIdentity ? '匿名选手' : player.nickname,
    primaryRole: shouldHideDetails ? null : player.primaryRole,
    primaryRoleLabel: shouldHideDetails ? null : player.primaryRoleLabel,
    primaryRank: shouldHideDetails ? null : player.primaryRank,
    wechatGroup: shouldHideDetails ? null : player.wechatGroup,
    passCount: Number(player.passCount || 0),
    soldPrice: player.soldPrice ?? null,
    assignedType: player.assignedType ?? null,
    masked: shouldMaskForDisplay,
    detailsMasked: shouldHideDetails
  };
};

const getSession = async (tenantId: string) => {
  const result = await pool.query(
    'SELECT * FROM auction_sessions WHERE tenant_id = $1 LIMIT 1',
    [tenantId]
  );
  return result.rows[0] || null;
};

const buildAuctionState = async (tenantId: string, viewer: AuctionViewer, teamCountInput?: any) => {
  const registrations = await getRegistrations(tenantId);
  const suggestedTeamCount = getSuggestedTeamCount(registrations.length);
  const requestedTeamCount = normalizeTeamCount(teamCountInput, suggestedTeamCount, registrations.length);
  const session = await getSession(tenantId);

  if (!session) {
    return {
      session: null,
      totalPlayers: registrations.length,
      suggestedTeamCount,
      requestedTeamCount,
      initialBudgetPreview: getInitialBudget(requestedTeamCount),
      rankOptions: buildRankOptions(registrations, requestedTeamCount),
      anonymousMode: false,
      currentPlayer: null,
      currentHighestBid: 0,
      currentHighestTeamId: null,
      currentHighestTeamName: null,
      teams: [],
      pool: registrations.map(player => serializePlayer(player, viewer, false, 'pool')),
      actions: {
        canDrawCaptains: registrations.length >= requestedTeamCount,
        canDrawPlayer: false,
        canFinishCurrent: false,
        canPassCurrent: false,
        canReset: false
      }
    };
  }

  const playersResult = await pool.query(
    `SELECT ap.id AS "auctionPlayerId", ap.registration_id AS "registrationId", ap.status, ap.team_id AS "teamId",
            ap.sold_price AS "soldPrice", ap.pass_count AS "passCount", ap.assigned_type AS "assignedType",
            r.id, r.battle_tag, r.wechat_group, r.primary_roles, r.secondary_roles, r.self_ranks
       FROM auction_players ap
       JOIN registrations r ON r.id = ap.registration_id
      WHERE ap.tenant_id = $1 AND ap.session_id = $2
      ORDER BY ap.id ASC`,
    [tenantId, session.id]
  );

  const playerRows = playersResult.rows.map(row => ({
    ...getRegistrationPlayer(row),
    auctionPlayerId: row.auctionPlayerId,
    registrationId: Number(row.registrationId),
    status: row.status,
    teamId: row.teamId === null ? null : Number(row.teamId),
    soldPrice: row.soldPrice === null ? null : Number(row.soldPrice),
    passCount: Number(row.passCount || 0),
    assignedType: row.assignedType
  }));

  const teamsResult = await pool.query(
    `SELECT at.*, r.battle_tag, r.wechat_group, r.primary_roles, r.secondary_roles, r.self_ranks
       FROM auction_teams at
       LEFT JOIN registrations r ON r.id = at.captain_registration_id
      WHERE at.tenant_id = $1 AND at.session_id = $2
      ORDER BY at.id ASC`,
    [tenantId, session.id]
  );

  const teamCount = Number(session.team_count || teamsResult.rows.length || requestedTeamCount);
  const currentPlayer = playerRows.find(player => player.registrationId === Number(session.current_player_registration_id)) || null;
  const poolPlayers = playerRows.filter(player => player.status === 'pool');
  const remainingAuctionPlayers = poolPlayers.length + (currentPlayer ? 1 : 0);
  const anonymousMode = teamCount > 0 && remainingAuctionPlayers <= teamCount + 2;

  if (Boolean(session.anonymous_mode) !== anonymousMode) {
    await pool.query(
      'UPDATE auction_sessions SET anonymous_mode = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
      [anonymousMode, session.id, tenantId]
    );
  }

  const teams = teamsResult.rows.map(team => {
    const captain = team.captain_registration_id ? getRegistrationPlayer(team) : null;
    const members = playerRows
      .filter(player => player.teamId === Number(team.id) && (player.status === 'sold' || player.status === 'manual_assigned'))
      .map(player => serializePlayer(player, viewer, anonymousMode, 'team'));

    const data: any = {
      id: Number(team.id),
      name: team.name,
      captain: captain ? serializePlayer(captain, viewer, false, 'team') : null,
      budgetTotal: Number(team.budget_total || 0),
      budgetRemaining: Number(team.budget_remaining || 0),
      lockedBidAmount: Number(team.locked_bid_amount || 0),
      members
    };
    if (viewer === 'admin') {
      data.captainCode = team.captain_code;
    }
    return data;
  });

  let highestTeamId = session.current_highest_team_id === null ? null : Number(session.current_highest_team_id);
  let currentHighestBid = Number(session.current_highest_bid || 0);

  if (currentPlayer) {
    const highestBidResult = await pool.query(
      `SELECT b.team_id AS "teamId", b.bid_amount AS "bidAmount"
         FROM auction_bids b
        WHERE b.tenant_id = $1
          AND b.session_id = $2
          AND b.player_registration_id = $3
        ORDER BY b.bid_amount DESC, b.created_at ASC
        LIMIT 1`,
      [tenantId, session.id, currentPlayer.registrationId]
    );
    const highestBid = highestBidResult.rows[0];
    if (highestBid) {
      const derivedTeamId = Number(highestBid.teamId);
      const derivedBidAmount = Number(highestBid.bidAmount);
      if (derivedTeamId !== highestTeamId || derivedBidAmount !== currentHighestBid) {
        await pool.query(
          `UPDATE auction_sessions
              SET current_highest_team_id = $1,
                  current_highest_bid = $2,
                  updated_at = NOW()
            WHERE id = $3 AND tenant_id = $4`,
          [derivedTeamId, derivedBidAmount, session.id, tenantId]
        );
      }
      highestTeamId = derivedTeamId;
      currentHighestBid = derivedBidAmount;
    }
  }

  const highestTeam = teams.find(team => team.id === highestTeamId) || null;

  return {
    session: {
      id: Number(session.id),
      status: session.status,
      teamCount,
      initialBudget: Number(session.initial_budget || 0),
      lastAction: session.last_action,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    },
    totalPlayers: registrations.length,
    suggestedTeamCount,
    requestedTeamCount: teamCount,
    initialBudgetPreview: getInitialBudget(teamCount),
    rankOptions: buildRankOptions(registrations, teamCount),
    anonymousMode,
    currentPlayer: currentPlayer ? serializePlayer(currentPlayer, viewer, anonymousMode, 'current') : null,
    currentHighestBid,
    currentHighestTeamId: highestTeamId,
    currentHighestTeamName: highestTeam?.name || null,
    teams,
    pool: poolPlayers.map(player => serializePlayer(player, viewer, anonymousMode, 'pool')),
    actions: {
      canDrawCaptains: false,
      canDrawPlayer: teams.length > 0 && !currentPlayer && poolPlayers.length > 0,
      canFinishCurrent: Boolean(currentPlayer && highestTeamId && currentHighestBid > 0),
      canPassCurrent: Boolean(currentPlayer && !highestTeamId && currentHighestBid === 0),
      canReset: true
    }
  };
};

const getCaptainToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1] || null;
};

const captainAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = getCaptainToken(req);
  if (!token) return jsonError(res, 401, '请先登录拍卖系统');

  const secret = process.env.JWT_SECRET;
  if (!secret) return jsonError(res, 500, '服务端 JWT_SECRET 未配置');

  try {
    const decoded = jwt.verify(token, secret) as CaptainPayload;
    if (decoded.type !== 'auction_captain') return jsonError(res, 401, '拍卖登录信息无效');
    const requestTenantId = req.tenantId || 'default';
    if (decoded.tenantId !== requestTenantId) return jsonError(res, 403, '无权访问该社区拍卖');

    const teamResult = await pool.query(
      'SELECT id FROM auction_teams WHERE id = $1 AND session_id = $2 AND tenant_id = $3',
      [decoded.teamId, decoded.sessionId, requestTenantId]
    );
    if (teamResult.rows.length === 0) return jsonError(res, 401, '拍卖队长身份已失效');

    (req as any).auctionCaptain = decoded;
    next();
  } catch {
    return jsonError(res, 401, '拍卖登录信息无效或已过期');
  }
};

router.get('/admin/auction/state', authMiddleware, async (req: Request, res: Response) => {
  try {
    const state = await buildAuctionState(req.tenantId || 'default', 'admin', req.query.teamCount);
    return jsonOk(res, '获取拍卖状态成功', state);
  } catch (error) {
    console.error('Fetch auction state error:', error);
    return jsonError(res, 500, '服务器内部错误');
  }
});

router.get('/admin/auction/captain-rank-options', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || 'default';
    const registrations = await getRegistrations(tenantId);
    const suggestedTeamCount = getSuggestedTeamCount(registrations.length);
    const teamCount = normalizeTeamCount(req.query.teamCount, suggestedTeamCount, registrations.length);
    return jsonOk(res, '获取队长段位统计成功', {
      totalPlayers: registrations.length,
      suggestedTeamCount,
      requestedTeamCount: teamCount,
      initialBudgetPreview: getInitialBudget(teamCount),
      rankOptions: buildRankOptions(registrations, teamCount)
    });
  } catch (error) {
    console.error('Fetch auction rank options error:', error);
    return jsonError(res, 500, '服务器内部错误');
  }
});

router.post('/admin/auction/reset', authMiddleware, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM auction_sessions WHERE tenant_id = $1', [req.tenantId || 'default']);
    const state = await buildAuctionState(req.tenantId || 'default', 'admin', req.body?.teamCount);
    return jsonOk(res, '拍卖状态已重置', state);
  } catch (error) {
    console.error('Reset auction error:', error);
    return jsonError(res, 500, '服务器内部错误');
  }
});

router.post('/admin/auction/draw-captains', authMiddleware, async (req: Request, res: Response) => {
  const tenantId = req.tenantId || 'default';
  const rankTier = String(req.body?.rankTier || '') as RankTier;

  if (!rankTiers.includes(rankTier)) {
    return jsonError(res, 400, '请选择有效的队长段位');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM auction_sessions WHERE tenant_id = $1 FOR UPDATE', [tenantId]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, '当前已有拍卖分队，请先重置后再抽取队长');
    }

    const registrationResult = await client.query(
      'SELECT id, battle_tag, wechat_group, primary_roles, secondary_roles, self_ranks FROM registrations WHERE tenant_id = $1 ORDER BY created_at ASC',
      [tenantId]
    );
    const registrations = registrationResult.rows.map(getRegistrationPlayer);
    const suggestedTeamCount = getSuggestedTeamCount(registrations.length);
    const teamCount = normalizeTeamCount(req.body?.teamCount, suggestedTeamCount, registrations.length);
    const initialBudget = getInitialBudget(teamCount);
    const candidates = registrations.filter(player => player.captainTier === rankTier);

    if (registrations.length < teamCount) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, '报名人数不足，无法抽取该数量的队长');
    }

    if (candidates.length < teamCount) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, `${rankTier}段位人数不足，无法抽取 ${teamCount} 名队长`);
    }

    const sessionResult = await client.query(
      `INSERT INTO auction_sessions (tenant_id, status, team_count, initial_budget, current_highest_bid, last_action, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 0, $5, NOW(), NOW())
       RETURNING id`,
      [tenantId, 'active', teamCount, initialBudget, 'draw_captains']
    );
    const sessionId = Number(sessionResult.rows[0].id);

    for (const player of registrations) {
      await client.query(
        `INSERT INTO auction_players (tenant_id, session_id, registration_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'pool', NOW(), NOW())`,
        [tenantId, sessionId, player.id]
      );
    }

    const captains = shuffle(candidates).slice(0, teamCount);
    for (let index = 0; index < captains.length; index++) {
      const captain = captains[index];
      if (!captain) continue;

      let code = generateCaptainCode();
      for (let tries = 0; tries < 5; tries++) {
        const duplicate = await client.query(
          'SELECT id FROM auction_teams WHERE tenant_id = $1 AND captain_code = $2',
          [tenantId, code]
        );
        if (duplicate.rows.length === 0) break;
        code = generateCaptainCode();
      }

      await client.query(
        `INSERT INTO auction_teams (tenant_id, session_id, name, captain_registration_id, captain_code, budget_total, budget_remaining, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6, NOW(), NOW())`,
        [tenantId, sessionId, `队伍 ${index + 1}`, captain.id, code, initialBudget]
      );
      await client.query(
        `UPDATE auction_players
            SET status = 'captain', updated_at = NOW()
          WHERE tenant_id = $1 AND session_id = $2 AND registration_id = $3`,
        [tenantId, sessionId, captain.id]
      );
    }

    await client.query('COMMIT');
    const state = await buildAuctionState(tenantId, 'admin');
    return jsonOk(res, '队长抽取成功', state);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Draw auction captains error:', error);
    return jsonError(res, 500, '服务器内部错误');
  } finally {
    client.release();
  }
});

router.post('/admin/auction/draw-player', authMiddleware, async (req: Request, res: Response) => {
  const tenantId = req.tenantId || 'default';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sessionResult = await client.query('SELECT * FROM auction_sessions WHERE tenant_id = $1 FOR UPDATE', [tenantId]);
    const session = sessionResult.rows[0];
    if (!session) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, '请先抽取队长');
    }
    if (session.current_player_registration_id) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, '当前队员尚未成交或流拍，不能抽取下一位');
    }

    const poolResult = await client.query(
      `SELECT registration_id
         FROM auction_players
        WHERE tenant_id = $1 AND session_id = $2 AND status = 'pool'
        ORDER BY RANDOM()
        LIMIT 1`,
      [tenantId, session.id]
    );
    const nextPlayer = poolResult.rows[0];
    if (!nextPlayer) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, '未分配选手池为空');
    }

    await client.query(
      `DELETE FROM auction_bids
        WHERE tenant_id = $1 AND session_id = $2 AND player_registration_id = $3`,
      [tenantId, session.id, nextPlayer.registration_id]
    );
    await client.query(
      `UPDATE auction_players
          SET status = 'current', team_id = NULL, sold_price = NULL, assigned_type = NULL, updated_at = NOW()
        WHERE tenant_id = $1 AND session_id = $2 AND registration_id = $3`,
      [tenantId, session.id, nextPlayer.registration_id]
    );
    await client.query(
      `UPDATE auction_teams SET locked_bid_amount = 0, updated_at = NOW()
        WHERE tenant_id = $1 AND session_id = $2`,
      [tenantId, session.id]
    );
    await client.query(
      `UPDATE auction_sessions
          SET current_player_registration_id = $1, current_highest_team_id = NULL, current_highest_bid = 0,
              last_action = 'draw_player', updated_at = NOW()
        WHERE tenant_id = $2 AND id = $3`,
      [nextPlayer.registration_id, tenantId, session.id]
    );

    await client.query('COMMIT');
    const state = await buildAuctionState(tenantId, 'admin');
    return jsonOk(res, '已抽取下一位拍卖队员', state);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Draw auction player error:', error);
    return jsonError(res, 500, '服务器内部错误');
  } finally {
    client.release();
  }
});

router.post('/admin/auction/finish-current', authMiddleware, async (req: Request, res: Response) => {
  const tenantId = req.tenantId || 'default';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sessionResult = await client.query('SELECT * FROM auction_sessions WHERE tenant_id = $1 FOR UPDATE', [tenantId]);
    const session = sessionResult.rows[0];
    if (!session?.current_player_registration_id) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, '当前没有正在拍卖的队员');
    }
    if (!session.current_highest_team_id || Number(session.current_highest_bid) <= 0) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, '当前无人出价，不能成交');
    }

    const bidAmount = Number(session.current_highest_bid);
    const teamResult = await client.query(
      'SELECT * FROM auction_teams WHERE id = $1 AND tenant_id = $2 AND session_id = $3 FOR UPDATE',
      [session.current_highest_team_id, tenantId, session.id]
    );
    const team = teamResult.rows[0];
    if (!team || Number(team.budget_remaining) < bidAmount) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, '最高出价队伍剩余资金不足，不能成交');
    }

    await client.query(
      `UPDATE auction_teams
          SET budget_remaining = budget_remaining - $1, locked_bid_amount = 0, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND session_id = $4`,
      [bidAmount, session.current_highest_team_id, tenantId, session.id]
    );
    await client.query(
      `UPDATE auction_players
          SET status = 'sold', team_id = $1, sold_price = $2, assigned_type = 'auction', updated_at = NOW()
        WHERE tenant_id = $3 AND session_id = $4 AND registration_id = $5`,
      [session.current_highest_team_id, bidAmount, tenantId, session.id, session.current_player_registration_id]
    );
    await client.query(
      `UPDATE auction_sessions
          SET current_player_registration_id = NULL, current_highest_team_id = NULL, current_highest_bid = 0,
              last_action = 'sold', updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2`,
      [tenantId, session.id]
    );

    await client.query('COMMIT');
    const state = await buildAuctionState(tenantId, 'admin');
    return jsonOk(res, '拍卖成交成功', state);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Finish auction current error:', error);
    return jsonError(res, 500, '服务器内部错误');
  } finally {
    client.release();
  }
});

router.post('/admin/auction/pass-current', authMiddleware, async (req: Request, res: Response) => {
  const tenantId = req.tenantId || 'default';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sessionResult = await client.query('SELECT * FROM auction_sessions WHERE tenant_id = $1 FOR UPDATE', [tenantId]);
    const session = sessionResult.rows[0];
    if (!session?.current_player_registration_id) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, '当前没有正在拍卖的队员');
    }
    if (session.current_highest_team_id || Number(session.current_highest_bid) > 0) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, '当前已有出价，不能流拍');
    }

    await client.query(
      `UPDATE auction_players
          SET status = 'pool', team_id = NULL, sold_price = NULL, assigned_type = NULL,
              pass_count = pass_count + 1, last_passed_at = NOW(), updated_at = NOW()
        WHERE tenant_id = $1 AND session_id = $2 AND registration_id = $3`,
      [tenantId, session.id, session.current_player_registration_id]
    );
    await client.query(
      `UPDATE auction_sessions
          SET current_player_registration_id = NULL, current_highest_team_id = NULL, current_highest_bid = 0,
              last_action = 'passed', updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2`,
      [tenantId, session.id]
    );

    await client.query('COMMIT');
    const state = await buildAuctionState(tenantId, 'admin');
    return jsonOk(res, '已标记流拍', state);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Pass auction current error:', error);
    return jsonError(res, 500, '服务器内部错误');
  } finally {
    client.release();
  }
});

router.post('/admin/auction/manual-assign', authMiddleware, async (req: Request, res: Response) => {
  const tenantId = req.tenantId || 'default';
  const registrationId = Number(req.body?.registrationId);
  const teamId = Number(req.body?.teamId);
  if (!Number.isInteger(registrationId) || !Number.isInteger(teamId)) {
    return jsonError(res, 400, '缺少有效的队员或队伍参数');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sessionResult = await client.query('SELECT * FROM auction_sessions WHERE tenant_id = $1 FOR UPDATE', [tenantId]);
    const session = sessionResult.rows[0];
    if (!session) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, '请先抽取队长');
    }

    const teamResult = await client.query(
      'SELECT id FROM auction_teams WHERE id = $1 AND tenant_id = $2 AND session_id = $3',
      [teamId, tenantId, session.id]
    );
    if (teamResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, '目标队伍无效');
    }

    const playerResult = await client.query(
      `SELECT * FROM auction_players
        WHERE tenant_id = $1 AND session_id = $2 AND registration_id = $3 FOR UPDATE`,
      [tenantId, session.id, registrationId]
    );
    const player = playerResult.rows[0];
    if (!player || player.status !== 'pool') {
      await client.query('ROLLBACK');
      return jsonError(res, 400, '只能从未分配选手池手动分队');
    }

    await client.query(
      `UPDATE auction_players
          SET status = 'manual_assigned', team_id = $1, sold_price = 0, assigned_type = 'manual', updated_at = NOW()
        WHERE tenant_id = $2 AND session_id = $3 AND registration_id = $4`,
      [teamId, tenantId, session.id, registrationId]
    );
    await client.query(
      `UPDATE auction_sessions SET last_action = 'manual_assigned', updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2`,
      [tenantId, session.id]
    );

    await client.query('COMMIT');
    const state = await buildAuctionState(tenantId, 'admin');
    return jsonOk(res, '手动分队成功', state);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Manual assign auction player error:', error);
    return jsonError(res, 500, '服务器内部错误');
  } finally {
    client.release();
  }
});

router.post('/auction/login', async (req: Request, res: Response) => {
  const tenantId = req.tenantId || 'default';
  const captainCode = String(req.body?.captainCode || '').trim().toUpperCase();
  if (!captainCode) return jsonError(res, 400, '请输入拍卖码');

  const secret = process.env.JWT_SECRET;
  if (!secret) return jsonError(res, 500, '服务端 JWT_SECRET 未配置');

  try {
    const result = await pool.query(
      `SELECT at.id AS "teamId", at.session_id AS "sessionId"
         FROM auction_teams at
         JOIN auction_sessions s ON s.id = at.session_id
        WHERE at.tenant_id = $1 AND at.captain_code = $2 AND s.status = 'active'
        LIMIT 1`,
      [tenantId, captainCode]
    );
    const team = result.rows[0];
    if (!team) return jsonError(res, 401, '拍卖码无效或已失效');

    const payload: CaptainPayload = {
      type: 'auction_captain',
      tenantId,
      sessionId: Number(team.sessionId),
      teamId: Number(team.teamId)
    };
    const token = jwt.sign(payload, secret, { expiresIn: '12h' });
    return jsonOk(res, '拍卖登录成功', { token, teamId: payload.teamId });
  } catch (error) {
    console.error('Auction captain login error:', error);
    return jsonError(res, 500, '服务器内部错误');
  }
});

router.get('/auction/state', captainAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const captain = (req as any).auctionCaptain as CaptainPayload;
    const state = await buildAuctionState(captain.tenantId, 'captain');
    return jsonOk(res, '获取拍卖状态成功', { ...state, myTeamId: captain.teamId });
  } catch (error) {
    console.error('Fetch captain auction state error:', error);
    return jsonError(res, 500, '服务器内部错误');
  }
});

router.post('/auction/bid', captainAuthMiddleware, async (req: Request, res: Response) => {
  const captain = (req as any).auctionCaptain as CaptainPayload;
  const bidAmount = Number(req.body?.bidAmount);
  if (!Number.isInteger(bidAmount)) {
    return jsonError(res, 400, '出价必须是整数');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sessionResult = await client.query(
      'SELECT * FROM auction_sessions WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
      [captain.sessionId, captain.tenantId]
    );
    const session = sessionResult.rows[0];
    if (!session?.current_player_registration_id) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, '当前没有正在拍卖的队员');
    }

    const teamResult = await client.query(
      'SELECT * FROM auction_teams WHERE id = $1 AND session_id = $2 AND tenant_id = $3 FOR UPDATE',
      [captain.teamId, captain.sessionId, captain.tenantId]
    );
    const team = teamResult.rows[0];
    if (!team) {
      await client.query('ROLLBACK');
      return jsonError(res, 401, '拍卖队长身份已失效');
    }

    const currentHighestBid = Number(session.current_highest_bid || 0);
    const minimumBid = currentHighestBid + 1;
    const budgetRemaining = Number(team.budget_remaining || 0);
    if (bidAmount < minimumBid) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, `最低出价为 ${minimumBid}`);
    }
    if (bidAmount > budgetRemaining) {
      await client.query('ROLLBACK');
      return jsonError(res, 400, '出价不能超过本队剩余资金');
    }

    await client.query(
      `INSERT INTO auction_bids (tenant_id, session_id, team_id, player_registration_id, bid_amount, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [captain.tenantId, captain.sessionId, captain.teamId, session.current_player_registration_id, bidAmount]
    );
    await client.query(
      `UPDATE auction_teams SET locked_bid_amount = 0, updated_at = NOW()
        WHERE tenant_id = $1 AND session_id = $2`,
      [captain.tenantId, captain.sessionId]
    );
    await client.query(
      `UPDATE auction_teams SET locked_bid_amount = $1, updated_at = NOW()
        WHERE tenant_id = $2 AND session_id = $3 AND id = $4`,
      [bidAmount, captain.tenantId, captain.sessionId, captain.teamId]
    );
    await client.query(
      `UPDATE auction_sessions
          SET current_highest_team_id = $1, current_highest_bid = $2,
              last_action = 'bid', updated_at = NOW()
        WHERE tenant_id = $3 AND id = $4`,
      [captain.teamId, bidAmount, captain.tenantId, captain.sessionId]
    );

    await client.query('COMMIT');
    const state = await buildAuctionState(captain.tenantId, 'captain');
    return jsonOk(res, '出价成功', { ...state, myTeamId: captain.teamId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Auction bid error:', error);
    return jsonError(res, 500, '服务器内部错误');
  } finally {
    client.release();
  }
});

export default router;
