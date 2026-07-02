export interface TournamentOgData {
  tournamentName: string;
  format: string;
  prizePool: number;
  entryFee: number;
  gameMode: string;
  startTime: string;
  status: string;
  siteName: string;
  logoUrl?: string;
}

export interface HomepageOgData {
  title: string;
  description: string;
  siteName: string;
  siteDomain: string;
  logoUrl?: string;
}

export interface CustomPageOgData {
  title: string;
  description: string;
  siteName: string;
  siteDomain: string;
  logoUrl?: string;
}

export interface AuthPageOgData {
  title: string;
  description: string;
  siteName: string;
  siteDomain: string;
  logoUrl?: string;
}
