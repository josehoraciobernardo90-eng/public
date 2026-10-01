
export enum ContainerStatus {
  NORMAL = 'normal',
  ALERT = 'alert'
}

export interface CitizenReport {
  id: string;
  citizenName: string;
  citizenContact: string;
  citizenNeighborhood?: string;
  citizenZone?: string;
  reportedAt: string;
  note?: string;
}

export interface CollectionEntry {
  id: string;
  timestamp: string;
  operator: string;
  reporters?: CitizenReport[];
  totalReports?: number;
  firstReportAt?: string;
  durationMinutes?: number;
  notes?: string;
  containerSnapshot?: {
    id: string;
    neighborhood: string;
    avenue: string;
    block: string;
    referencePoint: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface ResolvedIncident {
  id: string;
  containerId: string;
  neighborhood: string;
  avenue: string;
  block: string;
  referencePoint: string;
  latitude?: number;
  longitude?: number;
  operator: string;
  collectedAt: string;
  firstReportAt: string;
  lastReportAt: string;
  totalReports: number;
  reporters: CitizenReport[];
  durationMinutes?: number;
  notes?: string;
}

export interface WasteContainer {
  id: string;
  neighborhood: string;
  avenue: string;
  block: string;
  referencePoint: string;
  status: ContainerStatus;
  lastReportedAt?: string;
  reportCount: number;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  activeReports?: CitizenReport[];
  history?: CollectionEntry[];
}

export interface CitizenProfile {
  name: string;
  city: string;
  neighborhood: string;
  zone: string;
  contact: string;
  pin: string;
}

export type AnnouncementReactionKind = 'like' | 'dislike';

export interface AnnouncementCitizen {
  name: string;
  city: string;
  neighborhood: string;
  zone: string;
  contact: string;
}

export interface AnnouncementReaction {
  contact: string;
  reaction: AnnouncementReactionKind;
  citizen: AnnouncementCitizen;
  reactedAt: string;
}

export interface Announcement {
  id: string;
  message: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  reactions: AnnouncementReaction[];
}

export interface PinResetRequest {
  id: string;
  contact: string;
  requestedAt: string;
  expiresAt: string;
  approved: boolean;
}

export type PinResetClientStatus = 'pending' | 'approved' | 'completed' | 'rejected' | 'error';

export interface PinResetClientState {
  requestId?: string;
  contact?: string;
  status: PinResetClientStatus;
  message?: string;
}

export type UserRole = 'citizen' | 'operational';
export type Language = 'pt' | 'en';
