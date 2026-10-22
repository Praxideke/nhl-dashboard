import type {
  StandingRow,
  GameRow,
  TeamInfo,
  GameStatus,
} from '../../packages/shared/src/types';

interface RawStanding {
  teamName: { default: string };
  teamAbbrev: { default: string };
  teamLogo?: string;
  conferenceName: string;
  divisionName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  pointPctg: number;
  goalFor: number;
  goalAgainst: number;
  goalDifferential: number;
  divisionSequence: number;
  conferenceSequence: number;
  wildcardSequence: number;
  streakCode: string;
  streakCount: number;
  regulationWins: number;
  regulationPlusOtWins: number;
  homeWins: number;
  homeLosses: number;
  homeOtLosses: number;
  roadWins: number;
  roadLosses: number;
  roadOtLosses: number;
  l10Wins: number;
  l10Losses: number;
  l10OtLosses: number;
  clinchIndicator?: string;
}

interface RawStandingsResponse {
  standings: RawStanding[];
}

function gameSortKey(g: any): string {
  if (g.gameDate) return g.gameDate;
  if (g.startTimeUTC) return g.startTimeUTC;
  return '';
}

/**
 * Пересчитываем текущую серию из последних 5 игр.
 * OTL считается как поражение в серии (не прерывает её).
 * Если серия достигла длины last5 (все 5 одного типа) — берём count из API
 * (на случай если серия длиннее 5, например W7).
 */
function calculateStreak(
  last5: ('W' | 'L' | 'OTL')[],
  apiStreakCode: string,
  apiStreakCount: number
): string {
  if (last5.length === 0) return '—';

  const latest = last5[last5.length - 1];
  const isWin = latest === 'W';

  let count = 0;
  for (let i = last5.length - 1; i >= 0; i--) {
    const r = last5[i];
    if (isWin && r === 'W') count++;
    else if (!isWin && (r === 'L' || r === 'OTL')) count++;
    else break;
  }

  // Если вся last5 — одинаковая серия, вероятно она длиннее → берём count из API
  if (count === last5.length) {
    const apiIsWin = apiStreakCode === 'W';
    const apiIsLoss = apiStreakCode === 'L' || apiStreakCode === 'OT';
    if ((isWin && apiIsWin) || (!isWin && apiIsLoss)) {
      return `${isWin ? 'W' : 'L'}${apiStreakCount}`;
    }
  }

  return `${isWin ? 'W' : 'L'}${count}`;
}

export function normalizeStandings(
  raw: RawStandingsResponse,
  last5Map: Record<string, any[]> = {},
  nextGameMap: Record<string, any | null> = {}
): StandingRow[] {
  return raw.standings.map((s, index) => {
    const abbrev = s.teamAbbrev.default;
    const teamGames = last5Map[abbrev] || [];

    const last5 = teamGames.map((g) => {
      const isHome = g.homeTeam.abbrev === abbrev;
      const teamScore = isHome ? g.homeTeam.score : g.awayTeam.score;
      const oppScore = isHome ? g.awayTeam.score : g.homeTeam.score;

      if (teamScore === undefined || oppScore === undefined) return 'L';
      if (teamScore > oppScore) return 'W';
      if (
        g.gameOutcome?.lastPeriodType === 'OT' ||
        g.gameOutcome?.lastPeriodType === 'SO'
      )
        return 'OTL';
      return 'L';
    });

    let nextGame: StandingRow['nextGame'] | undefined = undefined;
    const rawNext = nextGameMap[abbrev];
    if (rawNext) {
      const isHome = rawNext.homeTeam.abbrev === abbrev;
      const opp = isHome ? rawNext.awayTeam : rawNext.homeTeam;
      nextGame = {
        date: gameSortKey(rawNext).slice(0, 10),
        startTimeUTC: rawNext.startTimeUTC,
        isHome,
        opponentAbbrev: opp.abbrev,
        opponentName:
          opp.commonName?.default ||
          opp.name?.default ||
          opp.city ||
          opp.abbrev,
      };
    }

    const team: TeamInfo = {
      id: 0,
      abbrev,
      name: s.teamName.default,
      logo:
        s.teamLogo ??
        `https://assets.nhle.com/logos/nhl/svg/${abbrev}_light.svg`,
    };

    return {
      team,
      conference: s.conferenceName,
      division: s.divisionName,
      rank: s.conferenceSequence ?? index + 1,
      gamesPlayed: s.gamesPlayed,
      wins: s.wins,
      losses: s.losses,
      otLosses: s.otLosses,
      points: s.points,
      pointPctg: Number(s.pointPctg.toFixed(3)),
      goalFor: s.goalFor,
      goalAgainst: s.goalAgainst,
      goalDiff: s.goalDifferential,
      streak: calculateStreak(
        last5 as ('W' | 'L' | 'OTL')[],
        s.streakCode,
        s.streakCount
      ),
      regulationWins: s.regulationWins,
      regulationPlusOtWins: s.regulationPlusOtWins,
      homeRecord: `${s.homeWins}-${s.homeLosses}-${s.homeOtLosses}`,
      roadRecord: `${s.roadWins}-${s.roadLosses}-${s.roadOtLosses}`,
      last10Record: `${s.l10Wins}-${s.l10Losses}-${s.l10OtLosses}`,
      wildcardRank: s.wildcardSequence,
      last5: last5 as ('W' | 'L' | 'OTL')[],
      last5Games: teamGames,
      clinchIndicator: s.clinchIndicator || undefined,
      nextGame,
    };
  });
}

interface RawGame {
  id: number;
  season: number;
  gameType: number;
  startTimeUTC: string;
  gameState: 'FUT' | 'PRE' | 'LIVE' | 'CRIT' | 'FINAL' | 'OFF';
  awayTeam: RawTeamInGame;
  homeTeam: RawTeamInGame;
  periodDescriptor?: {
    number: number;
    periodType: 'REG' | 'OT' | 'SO';
  };
  gameOutcome?: {
    lastPeriodType: 'REG' | 'OT' | 'SO';
  };
}

interface RawTeamInGame {
  id: number;
  name?: { default: string };
  commonName?: { default: string };
  placeName?: { default: string };
  city?: string;
  abbrev: string;
  logo: string;
  score?: number;
}

interface RawScheduleDay {
  date: string;
  dayAbbrev: string;
  numberOfGames: number;
  games: RawGame[];
}

interface RawScheduleResponse {
  gameWeek: RawScheduleDay[];
}

function getTeamName(t: RawTeamInGame): string {
  if (t.commonName?.default) return t.commonName.default;
  if (t.name?.default) return t.name.default;
  if (t.city) return t.city;
  return t.abbrev;
}

function mapGameStatus(raw: RawGame): {
  status: GameStatus;
  period?: string;
  clock?: string;
} {
  const state = raw.gameState;

  if (state === 'FINAL' || state === 'OFF') {
    const ending = raw.gameOutcome?.lastPeriodType;
    return {
      status: 'FINAL',
      period: ending && ending !== 'REG' ? ending : undefined,
    };
  }

  if (state === 'LIVE' || state === 'CRIT') {
    const pd = raw.periodDescriptor;
    let periodLabel: string | undefined;
    if (pd) {
      if (pd.periodType === 'OT') periodLabel = 'OT';
      else if (pd.periodType === 'SO') periodLabel = 'SO';
      else periodLabel = `P${pd.number}`;
    }
    return {
      status: 'LIVE',
      period: periodLabel,
    };
  }

  return { status: 'FUT' };
}

export function normalizeSchedule(raw: RawScheduleResponse): GameRow[] {
  const rows: GameRow[] = [];

  for (const day of raw.gameWeek) {
    for (const game of day.games) {
      const { status, period, clock } = mapGameStatus(game);

      const homeTeam: GameRow['homeTeam'] = {
        id: game.homeTeam.id,
        abbrev: game.homeTeam.abbrev,
        name: getTeamName(game.homeTeam),
        logo: game.homeTeam.logo,
        score: game.homeTeam.score,
      };

      const awayTeam: GameRow['awayTeam'] = {
        id: game.awayTeam.id,
        abbrev: game.awayTeam.abbrev,
        name: getTeamName(game.awayTeam),
        logo: game.awayTeam.logo,
        score: game.awayTeam.score,
      };

      rows.push({
        id: game.id,
        date: day.date,
        startTimeUTC: game.startTimeUTC,
        status,
        homeTeam,
        awayTeam,
        period,
        clock,
      });
    }
  }

  return rows.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.id - b.id;
  });
}
