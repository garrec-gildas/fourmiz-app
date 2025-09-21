// types/legal-engagements.ts
// Types TypeScript pour le système d'engagements légaux

export interface LegalEngagementType {
  id: string;
  code: string;
  title: string;
  description: string;
  details?: string;
  version: string;
  is_active: boolean;
  is_required_for_fourmiz: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserLegalEngagement {
  id: string;
  user_id: string;
  engagement_type_id: string;
  is_accepted: boolean;
  accepted_at?: string;
  accepted_version: string;
  ip_address?: string;
  user_agent?: string;
  revoked_at?: string;
  revoked_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GrandfatheredStatus {
  isGrandfathered: boolean;
  engagementsRequired: boolean;
}

export interface ComplianceStatus {
  isCompliant: boolean;
  isGrandfathered: boolean;
  reason?: string;
}

export interface EngagementFormData {
  [key: string]: boolean; // Clés dynamiques comme "legal_engagementAccepted"
}

export interface EngagementValidation {
  isValid: boolean;
  error?: string;
  acceptedCount: number;
  totalRequired: number;
}

export interface AcceptEngagementParams {
  userId: string;
  engagementTypes: LegalEngagementType[];
  ipAddress?: string;
  userAgent?: string;
}

export interface EngagementComponentProps {
  userId: string;
  isFourmizRole: boolean;
  isEditMode?: boolean;
  onValidationChange?: (validation: EngagementValidation) => void;
  formData: EngagementFormData;
  onFormDataChange: (data: Partial<EngagementFormData>) => void;
  error?: string;
}

export interface EngagementHookReturn {
  // Data
  engagementTypes: LegalEngagementType[];
  userEngagements: UserLegalEngagement[];
  grandfatheredStatus: GrandfatheredStatus;
  
  // Loading states
  isLoading: boolean;
  isLoadingTypes: boolean;
  isLoadingStatus: boolean;
  isSaving: boolean;
  
  // Actions
  loadEngagements: (userId: string) => Promise<void>;
  checkGrandfatheredStatus: (userId: string) => Promise<GrandfatheredStatus>;
  checkCompliance: (userId: string) => Promise<ComplianceStatus>;
  acceptAllEngagements: (params: AcceptEngagementParams) => Promise<void>;
  
  // Validation
  validateEngagements: (formData: EngagementFormData, engagementTypes: LegalEngagementType[]) => EngagementValidation;
  
  // Utilities
  isEngagementAccepted: (engagementCode: string, formData: EngagementFormData) => boolean;
  getAcceptedCount: (formData: EngagementFormData, engagementTypes: LegalEngagementType[]) => number;
  initializeFormData: (types: LegalEngagementType[], userEngs: UserLegalEngagement[]) => EngagementFormData;
  isDataReady: () => boolean;
  getValidationStatus: (formData: EngagementFormData, isFourmizRole: boolean) => EngagementValidation;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}