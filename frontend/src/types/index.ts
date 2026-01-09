// Grid row data type
export interface GridRow {
  id: number;
  patientId: number;
  memberName: string;
  memberDob: string;
  memberTelephone: string | null;
  memberAddress: string | null;
  requestType: string;
  qualityMeasure: string;
  measureStatus: string;
  statusDate: string | null;
  statusDatePrompt: string | null;
  tracking1: string | null;
  tracking2: string | null;
  tracking3: string | null;
  dueDate: string | null;
  timeIntervalDays: number | null;
  notes: string | null;
  rowOrder: number;
  isDuplicate: boolean;
  hgba1cGoal?: string | null;
  hgba1cGoalReachedYear?: boolean;
  hgba1cDeclined?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Configuration types
export interface RequestType {
  id: number;
  code: string;
  label: string;
  autoQualityMeasure: string | null;
  sortOrder: number;
}

export interface QualityMeasure {
  id: number;
  requestTypeId: number;
  code: string;
  label: string;
  allowDuplicates: boolean;
  sortOrder: number;
}

export interface MeasureStatus {
  id: number;
  qualityMeasureId: number;
  code: string;
  label: string;
  datePrompt: string | null;
  baseDueDays: number | null;
  showDueDateInput: boolean;
  sortOrder: number;
}

export interface TrackingOption {
  id: number;
  measureStatusId: number;
  trackingNumber: number;
  optionValue: string | null;
  defaultText: string | null;
  sortOrder: number;
}

export interface HgbA1cGoalOption {
  id: number;
  code: string;
  label: string;
  threshold: number;
  sortOrder: number;
}

export interface ConditionalFormat {
  id: number;
  name: string;
  conditionType: string;
  conditionValue: string;
  backgroundColor: string;
  textColor: string;
  priority: number;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface ConfigData {
  requestTypes: RequestType[];
  qualityMeasures: QualityMeasure[];
  measureStatuses: MeasureStatus[];
  trackingOptions: TrackingOption[];
  dueDayRules: DueDayRule[];
  hgba1cGoalOptions: HgbA1cGoalOption[];
  conditionalFormats: ConditionalFormat[];
}

export interface DueDayRule {
  id: number;
  measureStatusId: number;
  trackingValue: string | null;
  dueDays: number;
}
