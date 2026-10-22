export interface TeamInfo {
  id: number;
  abbrev: string;
  name: string;
  logo: string;
}

export interface NextGameInfo {
  date: string;
  startTimeUTC?: string;
  isHome: boolean;
  opponentAbbrev: string;
  opponentName: string;
}

export interface StandingRow {
  team: TeamInfo;
  conference: string;
  division: string;
  rank: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  pointPctg: number;
  goalFor: number;
  goalAgainst: number;
  goalDiff: number;
  streak: string;
  regulationWins: number;
  regulationPlusOtWins: number;
  homeRecord: string;
  roadRecord: string;
  last10Record: string;
  wildcardRank: number;
  last5: ('W' | 'L' | 'OTL')[];
  last5Games?: any[];
  clinchIndicator?: string;
  nextGame?: NextGameInfo;
}

export type GameStatus = 'LIVE' | 'FINAL' | 'FUT';

export interface GameRow {
  id: number;
  date: string;
  startTimeUTC?: string;
  status: GameStatus;
  homeTeam: TeamInfo & { score?: number };
  awayTeam: TeamInfo & { score?: number };
  period?: string;
  clock?: string;
}
