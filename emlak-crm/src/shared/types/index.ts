// =============================================================================
// Emlak CRM - Shared TypeScript Type Definitions
// Turkish Real Estate CRM System
// =============================================================================

// -----------------------------------------------------------------------------
// Enums (matching Prisma schema)
// -----------------------------------------------------------------------------

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OFFICE_ADMIN = 'OFFICE_ADMIN',
  TEAM_LEADER = 'TEAM_LEADER',
  AGENT = 'AGENT',
  ASSISTANT = 'ASSISTANT',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export enum ContactType {
  INDIVIDUAL = 'INDIVIDUAL',
  CORPORATE = 'CORPORATE',
}

export enum ContactSource {
  WALK_IN = 'WALK_IN',
  PHONE = 'PHONE',
  WEBSITE = 'WEBSITE',
  PORTAL = 'PORTAL',
  REFERRAL = 'REFERRAL',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  NEWSPAPER = 'NEWSPAPER',
  BILLBOARD = 'BILLBOARD',
  OTHER = 'OTHER',
}

export enum ContactStatus {
  LEAD = 'LEAD',
  PROSPECT = 'PROSPECT',
  CLIENT = 'CLIENT',
  PAST_CLIENT = 'PAST_CLIENT',
  INACTIVE = 'INACTIVE',
}

export enum PropertyType {
  DAIRE = 'DAIRE',
  VILLA = 'VILLA',
  MUSTAKIL_EV = 'MUSTAKIL_EV',
  YAZLIK = 'YAZLIK',
  CIFTLIK_EVI = 'CIFTLIK_EVI',
  KOOPERATIF = 'KOOPERATIF',
  REZIDANS = 'REZIDANS',
  DUKKAN = 'DUKKAN',
  MAGAZA = 'MAGAZA',
  OFIS = 'OFIS',
  DEPO = 'DEPO',
  FABRIKA = 'FABRIKA',
  ATOLYE = 'ATOLYE',
  ARSA = 'ARSA',
  TARLA = 'TARLA',
  BAG_BAHCE = 'BAG_BAHCE',
  TURISTIK_TESIS = 'TURISTIK_TESIS',
  APART_OTEL = 'APART_OTEL',
  BINA = 'BINA',
  PREFABRIK = 'PREFABRIK',
}

export enum ListingType {
  SATILIK = 'SATILIK',
  KIRALIK = 'KIRALIK',
  DEVREN_SATILIK = 'DEVREN_SATILIK',
  DEVREN_KIRALIK = 'DEVREN_KIRALIK',
  GUNLUK_KIRALIK = 'GUNLUK_KIRALIK',
  TAKAS = 'TAKAS',
}

export enum PropertyStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SOLD = 'SOLD',
  RENTED = 'RENTED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
  DRAFT = 'DRAFT',
}

export enum HeatingType {
  DOGALGAZ_KOMBI = 'DOGALGAZ_KOMBI',
  MERKEZI_DOGALGAZ = 'MERKEZI_DOGALGAZ',
  MERKEZI_KOMURLУ = 'MERKEZI_KOMURLU',
  SOBA = 'SOBA',
  YERDEN_ISITMA = 'YERDEN_ISITMA',
  KLIMA = 'KLIMA',
  GUNES_ENERJISI = 'GUNES_ENERJISI',
  ISI_POMPASI = 'ISI_POMPASI',
  YOK = 'YOK',
}

export enum FuelType {
  DOGALGAZ = 'DOGALGAZ',
  KOMUR = 'KOMUR',
  FUEL_OIL = 'FUEL_OIL',
  ELEKTRIK = 'ELEKTRIK',
  GUNES = 'GUNES',
  JEOTERMAL = 'JEOTERMAL',
}

export enum DeedStatus {
  KAT_MULKIYETI = 'KAT_MULKIYETI',
  KAT_IRTIFAKI = 'KAT_IRTIFAKI',
  ARSA_TAPUSU = 'ARSA_TAPUSU',
  HISSELI_TAPU = 'HISSELI_TAPU',
  KOOPERATIF = 'KOOPERATIF',
  TAHSIS = 'TAHSIS',
}

export enum UsageStatus {
  BOS = 'BOS',
  KIRACI_VAR = 'KIRACI_VAR',
  MALIK_OTURUYOR = 'MALIK_OTURUYOR',
  INSAAT_HALINDE = 'INSAAT_HALINDE',
}

export enum DealStatus {
  INITIAL_CONTACT = 'INITIAL_CONTACT',
  VIEWING_SCHEDULED = 'VIEWING_SCHEDULED',
  VIEWING_DONE = 'VIEWING_DONE',
  NEGOTIATION = 'NEGOTIATION',
  OFFER_MADE = 'OFFER_MADE',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  CONTRACT_DRAFT = 'CONTRACT_DRAFT',
  CONTRACT_SIGNED = 'CONTRACT_SIGNED',
  DEED_TRANSFER = 'DEED_TRANSFER',
  COMPLETED = 'COMPLETED',
  LOST = 'LOST',
  CANCELLED = 'CANCELLED',
}

export enum DealType {
  SALE = 'SALE',
  RENTAL = 'RENTAL',
  DAILY_RENTAL = 'DAILY_RENTAL',
}

export enum Currency {
  TRY = 'TRY',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

export enum ActivityType {
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  MEETING = 'MEETING',
  VIEWING = 'VIEWING',
  NOTE = 'NOTE',
  TASK = 'TASK',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  DOCUMENT = 'DOCUMENT',
  STATUS_CHANGE = 'STATUS_CHANGE',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum AppointmentType {
  VIEWING = 'VIEWING',
  MEETING = 'MEETING',
  APPRAISAL = 'APPRAISAL',
  CONTRACT_SIGNING = 'CONTRACT_SIGNING',
  DEED_TRANSFER = 'DEED_TRANSFER',
  KEY_DELIVERY = 'KEY_DELIVERY',
  PHOTO_SHOOT = 'PHOTO_SHOOT',
}

export enum CommissionStatus {
  PENDING = 'PENDING',
  INVOICED = 'INVOICED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PortalName {
  SAHIBINDEN = 'SAHIBINDEN',
  HEPSIEMLAK = 'HEPSIEMLAK',
  EMLAKJET = 'EMLAKJET',
  ENDEKSA = 'ENDEKSA',
}

export enum PortalListingStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  REMOVED = 'REMOVED',
}

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum MessageChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  PHONE = 'PHONE',
  PORTAL = 'PORTAL',
  WEBSITE = 'WEBSITE',
}

export enum NotificationType {
  TASK_DUE = 'TASK_DUE',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  NEW_LEAD = 'NEW_LEAD',
  DEAL_UPDATE = 'DEAL_UPDATE',
  COMMISSION_UPDATE = 'COMMISSION_UPDATE',
  PORTAL_UPDATE = 'PORTAL_UPDATE',
  SYSTEM = 'SYSTEM',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  VIEW = 'VIEW',
}

// -----------------------------------------------------------------------------
// Base / utility types
// -----------------------------------------------------------------------------

/** ISO-8601 date string */
export type ISODateString = string;

/** Base fields shared by all entities */
export interface BaseEntity {
  id: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// -----------------------------------------------------------------------------
// Geography types
// -----------------------------------------------------------------------------

export interface Il extends BaseEntity {
  name: string;
  code: string;
  ilceler?: Ilce[];
}

export interface Ilce extends BaseEntity {
  name: string;
  ilId: string;
  il?: Il;
  mahalleler?: Mahalle[];
}

export interface Mahalle extends BaseEntity {
  name: string;
  ilceId: string;
  ilce?: Ilce;
  postalCode?: string | null;
}

export interface Building extends BaseEntity {
  name: string;
  address: string;
  mahalleId: string;
  mahalle?: Mahalle;
  totalFloors: number;
  totalUnits: number;
  buildYear?: number | null;
  buildingAge?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  hasElevator: boolean;
  hasParking: boolean;
  hasSecurity: boolean;
  hasPlayground: boolean;
  hasPool: boolean;
  hasGym: boolean;
  hasSauna: boolean;
  managerName?: string | null;
  managerPhone?: string | null;
  aidat?: number | null;
  properties?: Property[];
}

// -----------------------------------------------------------------------------
// Office & User
// -----------------------------------------------------------------------------

export interface Office extends BaseEntity {
  name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
  website?: string | null;
  taxNumber?: string | null;
  taxOffice?: string | null;
  logoUrl?: string | null;
  ilId: string;
  ilceId: string;
  il?: Il;
  ilce?: Ilce;
  isActive: boolean;
  subscriptionEnd?: ISODateString | null;
  maxUsers: number;
  users?: User[];
}

export interface User extends BaseEntity {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
  status: UserStatus;
  officeId: string;
  office?: Office;
  teamLeaderId?: string | null;
  teamLeader?: User | null;
  teamMembers?: User[];
  commissionRate: number;
  lastLoginAt?: ISODateString | null;
  properties?: Property[];
  deals?: Deal[];
  activities?: Activity[];
  tasks?: Task[];
  appointments?: Appointment[];
}

// -----------------------------------------------------------------------------
// Contact
// -----------------------------------------------------------------------------

export interface Contact extends BaseEntity {
  type: ContactType;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  phone: string;
  phoneSecondary?: string | null;
  tcKimlikNo?: string | null;
  companyName?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  ilId?: string | null;
  ilceId?: string | null;
  il?: Il | null;
  ilce?: Ilce | null;
  source: ContactSource;
  status: ContactStatus;
  assignedToId?: string | null;
  assignedTo?: User | null;
  officeId: string;
  office?: Office;
  notes?: string | null;
  tags: string[];
  birthday?: ISODateString | null;
  kvkkConsent: boolean;
  kvkkConsentDate?: ISODateString | null;
  deals?: Deal[];
  activities?: Activity[];
  messages?: Message[];
}

// -----------------------------------------------------------------------------
// Property
// -----------------------------------------------------------------------------

export interface Feature extends BaseEntity {
  name: string;
  category: string;
  icon?: string | null;
}

export interface PropertyFeature {
  propertyId: string;
  featureId: string;
  feature?: Feature;
}

export interface PropertyPhoto extends BaseEntity {
  propertyId: string;
  url: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  order: number;
  isPrimary: boolean;
}

export interface PropertyDocument extends BaseEntity {
  propertyId: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  uploadedBy?: User;
}

export interface Property extends BaseEntity {
  referenceNo: string;
  title: string;
  description?: string | null;
  propertyType: PropertyType;
  listingType: ListingType;
  status: PropertyStatus;

  // Location
  ilId: string;
  ilceId: string;
  mahalleId?: string | null;
  buildingId?: string | null;
  il?: Il;
  ilce?: Ilce;
  mahalle?: Mahalle | null;
  building?: Building | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  // Pricing
  price: number;
  currency: Currency;
  pricePerM2?: number | null;
  aidat?: number | null;

  // Physical attributes
  grossArea?: number | null;
  netArea?: number | null;
  roomCount?: string | null; // e.g. "3+1", "2+1", "stüdyo"
  bedroomCount?: number | null;
  bathroomCount?: number | null;
  livingRoomCount?: number | null;
  balconyCount?: number | null;
  floorNumber?: number | null;
  totalFloors?: number | null;
  buildingAge?: number | null;
  buildYear?: number | null;

  // Property details
  heatingType?: HeatingType | null;
  fuelType?: FuelType | null;
  deedStatus?: DeedStatus | null;
  usageStatus?: UsageStatus | null;
  isFurnished: boolean;
  isInSite: boolean;
  siteName?: string | null;
  blockNumber?: string | null;
  unitNumber?: string | null;
  parcelNo?: string | null;
  adaNo?: string | null;
  gabariNo?: string | null;

  // Ownership
  ownerContactId?: string | null;
  ownerContact?: Contact | null;
  agentId: string;
  agent?: User;
  officeId: string;
  office?: Office;

  // SEO & meta
  slug?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;

  // Relations
  photos?: PropertyPhoto[];
  documents?: PropertyDocument[];
  features?: PropertyFeature[];
  portalListings?: PortalListing[];
  deals?: Deal[];
  activities?: Activity[];
}

// -----------------------------------------------------------------------------
// Deal / Transaction
// -----------------------------------------------------------------------------

export interface Deal extends BaseEntity {
  referenceNo: string;
  title: string;
  type: DealType;
  status: DealStatus;
  propertyId: string;
  property?: Property;
  contactId: string;
  contact?: Contact;
  agentId: string;
  agent?: User;
  officeId: string;
  office?: Office;

  // Financial
  askingPrice: number;
  offerPrice?: number | null;
  agreedPrice?: number | null;
  currency: Currency;
  commissionRate?: number | null;
  commissionAmount?: number | null;

  // Dates
  viewingDate?: ISODateString | null;
  offerDate?: ISODateString | null;
  contractDate?: ISODateString | null;
  closingDate?: ISODateString | null;
  expectedCloseDate?: ISODateString | null;

  // Rental specific
  leaseStartDate?: ISODateString | null;
  leaseEndDate?: ISODateString | null;
  monthlyRent?: number | null;
  deposit?: number | null;

  notes?: string | null;
  lostReason?: string | null;

  // Relations
  activities?: Activity[];
  commissions?: Commission[];
  appointments?: Appointment[];
}

// -----------------------------------------------------------------------------
// Activity
// -----------------------------------------------------------------------------

export interface Activity extends BaseEntity {
  type: ActivityType;
  title: string;
  description?: string | null;
  userId: string;
  user?: User;
  officeId: string;
  office?: Office;
  contactId?: string | null;
  contact?: Contact | null;
  propertyId?: string | null;
  property?: Property | null;
  dealId?: string | null;
  deal?: Deal | null;
  metadata?: Record<string, unknown> | null;
}

// -----------------------------------------------------------------------------
// Task
// -----------------------------------------------------------------------------

export interface Task extends BaseEntity {
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: ISODateString | null;
  completedAt?: ISODateString | null;
  assignedToId: string;
  assignedTo?: User;
  createdById: string;
  createdBy?: User;
  officeId: string;
  office?: Office;
  contactId?: string | null;
  contact?: Contact | null;
  propertyId?: string | null;
  property?: Property | null;
  dealId?: string | null;
  deal?: Deal | null;
}

// -----------------------------------------------------------------------------
// Appointment
// -----------------------------------------------------------------------------

export interface Appointment extends BaseEntity {
  type: AppointmentType;
  title: string;
  description?: string | null;
  status: AppointmentStatus;
  startDate: ISODateString;
  endDate: ISODateString;
  location?: string | null;
  agentId: string;
  agent?: User;
  contactId?: string | null;
  contact?: Contact | null;
  propertyId?: string | null;
  property?: Property | null;
  dealId?: string | null;
  deal?: Deal | null;
  officeId: string;
  office?: Office;
  reminderMinutes: number;
  reminderSent: boolean;
  notes?: string | null;
}

// -----------------------------------------------------------------------------
// Commission
// -----------------------------------------------------------------------------

export interface Commission extends BaseEntity {
  dealId: string;
  deal?: Deal;
  agentId: string;
  agent?: User;
  officeId: string;
  office?: Office;
  amount: number;
  currency: Currency;
  rate: number;
  status: CommissionStatus;
  invoiceNumber?: string | null;
  invoiceDate?: ISODateString | null;
  paymentDate?: ISODateString | null;
  notes?: string | null;
}

// -----------------------------------------------------------------------------
// Portal & Listings
// -----------------------------------------------------------------------------

export interface Portal extends BaseEntity {
  name: PortalName;
  displayName: string;
  isActive: boolean;
  officeId: string;
  office?: Office;
  apiKey?: string | null;
  apiSecret?: string | null;
  storeId?: string | null;
  config?: Record<string, unknown> | null;
  lastSyncAt?: ISODateString | null;
  listings?: PortalListing[];
}

export interface PortalListing extends BaseEntity {
  portalId: string;
  portal?: Portal;
  propertyId: string;
  property?: Property;
  externalId?: string | null;
  externalUrl?: string | null;
  status: PortalListingStatus;
  publishedAt?: ISODateString | null;
  expiresAt?: ISODateString | null;
  lastSyncAt?: ISODateString | null;
  views: number;
  favorites: number;
  inquiries: number;
  errorMessage?: string | null;
}

// -----------------------------------------------------------------------------
// Messaging
// -----------------------------------------------------------------------------

export interface Conversation extends BaseEntity {
  contactId: string;
  contact?: Contact;
  channel: MessageChannel;
  assignedToId?: string | null;
  assignedTo?: User | null;
  officeId: string;
  office?: Office;
  lastMessageAt?: ISODateString | null;
  isOpen: boolean;
  subject?: string | null;
  messages?: Message[];
}

export interface Message extends BaseEntity {
  conversationId: string;
  conversation?: Conversation;
  contactId: string;
  contact?: Contact;
  userId?: string | null;
  user?: User | null;
  direction: MessageDirection;
  channel: MessageChannel;
  content: string;
  subject?: string | null;
  isRead: boolean;
  readAt?: ISODateString | null;
  externalId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface MessageTemplate extends BaseEntity {
  name: string;
  channel: MessageChannel;
  subject?: string | null;
  content: string;
  variables: string[];
  officeId: string;
  office?: Office;
  isActive: boolean;
  createdById: string;
  createdBy?: User;
}

// -----------------------------------------------------------------------------
// Notification
// -----------------------------------------------------------------------------

export interface Notification extends BaseEntity {
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  user?: User;
  isRead: boolean;
  readAt?: ISODateString | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

// -----------------------------------------------------------------------------
// Audit & Compliance
// -----------------------------------------------------------------------------

export interface AuditLog extends BaseEntity {
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId: string;
  user?: User;
  officeId: string;
  office?: Office;
  ipAddress?: string | null;
  userAgent?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  description?: string | null;
}

export interface KvkkConsent extends BaseEntity {
  contactId: string;
  contact?: Contact;
  consentType: string;
  consentText: string;
  isGranted: boolean;
  grantedAt?: ISODateString | null;
  revokedAt?: ISODateString | null;
  ipAddress?: string | null;
  source: string;
}

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: ISODateString;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  message?: string;
  timestamp: ISODateString;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    stack?: string;
  };
  timestamp: ISODateString;
}

// -----------------------------------------------------------------------------
// Auth Types
// -----------------------------------------------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  officeId: string;
  role?: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: UserRole;
  officeId: string;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  user: Omit<User, 'office' | 'teamMembers' | 'properties' | 'deals' | 'activities' | 'tasks' | 'appointments'>;
  tokens: TokenPair;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// -----------------------------------------------------------------------------
// Filter Types
// -----------------------------------------------------------------------------

export interface ContactFilter {
  search?: string;
  type?: ContactType;
  status?: ContactStatus;
  source?: ContactSource;
  assignedToId?: string;
  ilId?: string;
  ilceId?: string;
  tags?: string[];
  createdFrom?: ISODateString;
  createdTo?: ISODateString;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PropertyFilter {
  search?: string;
  propertyType?: PropertyType | PropertyType[];
  listingType?: ListingType | ListingType[];
  status?: PropertyStatus | PropertyStatus[];
  ilId?: string;
  ilceId?: string;
  mahalleId?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: Currency;
  areaMin?: number;
  areaMax?: number;
  roomCount?: string[];
  bedroomMin?: number;
  bedroomMax?: number;
  bathroomMin?: number;
  floorMin?: number;
  floorMax?: number;
  buildingAgeMax?: number;
  heatingType?: HeatingType[];
  deedStatus?: DeedStatus[];
  usageStatus?: UsageStatus[];
  isFurnished?: boolean;
  isInSite?: boolean;
  hasElevator?: boolean;
  hasParking?: boolean;
  featureIds?: string[];
  agentId?: string;
  createdFrom?: ISODateString;
  createdTo?: ISODateString;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DealFilter {
  search?: string;
  type?: DealType;
  status?: DealStatus | DealStatus[];
  agentId?: string;
  contactId?: string;
  propertyId?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: Currency;
  expectedCloseDateFrom?: ISODateString;
  expectedCloseDateTo?: ISODateString;
  closedFrom?: ISODateString;
  closedTo?: ISODateString;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// -----------------------------------------------------------------------------
// Dashboard Types
// -----------------------------------------------------------------------------

export interface DashboardStats {
  totalProperties: number;
  activeProperties: number;
  totalContacts: number;
  newContactsThisMonth: number;
  totalDeals: number;
  activeDeals: number;
  closedDealsThisMonth: number;
  totalRevenue: number;
  revenueThisMonth: number;
  pendingCommissions: number;
  upcomingAppointments: number;
  overdueTasks: number;
  portalViews: number;
  portalInquiries: number;
  conversionRate: number;
  averageDealTime: number; // days
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  avatarUrl?: string | null;
  totalDeals: number;
  closedDeals: number;
  activeDeals: number;
  totalRevenue: number;
  commissionEarned: number;
  propertiesListed: number;
  viewingsConducted: number;
  contactsManaged: number;
  conversionRate: number;
  averageDealTime: number; // days
  period: {
    from: ISODateString;
    to: ISODateString;
  };
}

export interface PortalPerformance {
  portalName: PortalName;
  totalListings: number;
  activeListings: number;
  totalViews: number;
  totalFavorites: number;
  totalInquiries: number;
  viewsChange: number; // percentage change from last period
  inquiriesChange: number;
}

export interface RevenueBreakdown {
  period: string;
  sales: number;
  rentals: number;
  total: number;
  currency: Currency;
}

export interface DealPipeline {
  status: DealStatus;
  label: string;
  count: number;
  totalValue: number;
  currency: Currency;
}

export interface TopProperty {
  propertyId: string;
  referenceNo: string;
  title: string;
  thumbnailUrl?: string | null;
  views: number;
  favorites: number;
  inquiries: number;
  price: number;
  currency: Currency;
}

export interface DashboardData {
  stats: DashboardStats;
  agentPerformances: AgentPerformance[];
  portalPerformances: PortalPerformance[];
  revenueBreakdown: RevenueBreakdown[];
  dealPipeline: DealPipeline[];
  topProperties: TopProperty[];
  recentActivities: Activity[];
  upcomingAppointments: Appointment[];
  overdueTasks: Task[];
}

// -----------------------------------------------------------------------------
// Utility / helper types
// -----------------------------------------------------------------------------

/** Make specific keys optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Create input type from entity (omit auto-generated fields) */
export type CreateInput<T extends BaseEntity> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

/** Create update input type (all fields optional except id) */
export type UpdateInput<T extends BaseEntity> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>> & { id: string };

/** Extract only the scalar fields (no relations) */
export type ScalarFields<T> = {
  [K in keyof T as T[K] extends (Array<unknown> | object | undefined) ? never : K]: T[K];
};

/** Sort direction */
export type SortOrder = 'asc' | 'desc';

/** Generic select/include for queries */
export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  include?: string[];
}
