// Cascading Dropdown Configuration
// Based on Excel SetUp sheet

// Request Type → Quality Measure mapping
export const REQUEST_TYPE_TO_QUALITY_MEASURE: Record<string, string[]> = {
  'AWV': ['Annual Wellness Visit'],
  'Chronic DX': ['Chronic Diagnosis Code'],
  'Quality': [
    'Diabetic Eye Exam',
    'GC/Chlamydia Screening',
    'Diabetic Nephropathy',
    'Hypertension Management',
    'ACE/ARB in DM or CAD',
    'Vaccination',
    'Diabetes Control',
    'Annual Serum K&Cr',
  ],
  'Screening': [
    'Breast Cancer Screening',
    'Colon Cancer Screening',
    'Cervical Cancer Screening',
  ],
};

// Quality Measure → Measure Status mapping
export const QUALITY_MEASURE_TO_STATUS: Record<string, string[]> = {
  'Annual Wellness Visit': [
    'Not Addressed',
    'Patient called to schedule AWV',
    'AWV scheduled',
    'AWV completed',
    'Patient declined AWV',
    'Will call later to schedule',
    'No longer applicable',
  ],
  'Diabetic Eye Exam': [
    'Not Addressed',
    'Diabetic eye exam discussed',
    'Diabetic eye exam referral made',
    'Diabetic eye exam scheduled',
    'Diabetic eye exam completed',
    'Obtaining outside records',
    'Patient declined',
    'No longer applicable',
  ],
  'Colon Cancer Screening': [
    'Not Addressed',
    'Screening discussed',
    'Colon cancer screening ordered',
    'Colon cancer screening completed',
    'Obtaining outside records',
    'Patient declined screening',
    'No longer applicable',
    'Screening unnecessary',
  ],
  'Breast Cancer Screening': [
    'Not Addressed',
    'Screening discussed',
    'Screening test ordered',
    'Screening test completed',
    'Obtaining outside records',
    'Patient declined screening',
    'No longer applicable',
    'Screening unnecessary',
  ],
  'Cervical Cancer Screening': [
    'Not Addressed',
    'Screening discussed',
    'Screening appt made',
    'Screening completed',
    'Obtaining outside records',
    'Patient declined',
    'No longer applicable',
    'Screening unnecessary',
  ],
  'GC/Chlamydia Screening': [
    'Not Addressed',
    'Patient contacted for screening',
    'Test ordered',
    'GC/Clamydia screening completed',
    'Patient declined screening',
    'No longer applicable',
  ],
  'Diabetic Nephropathy': [
    'Not Addressed',
    'Patient contacted for screening',
    'Urine microalbumin ordered',
    'Urine microalbumin completed',
    'Patient declined screening',
    'No longer applicable',
  ],
  'Hypertension Management': [
    'Not Addressed',
    'Blood pressure at goal',
    'Scheduled call back - BP not at goal',
    'Scheduled call back - BP at goal',
    'Appointment scheduled',
    'Declined BP control',
    'No longer applicable',
  ],
  'ACE/ARB in DM or CAD': [
    'Not Addressed',
    'Patient on ACE/ARB',
    'ACE/ARB prescribed',
    'Patient declined',
    'Contraindicated',
    'No longer applicable',
  ],
  'Vaccination': [
    'Not Addressed',
    'Vaccination discussed',
    'Vaccination scheduled',
    'Vaccination completed',
    'Patient declined',
    'No longer applicable',
  ],
  'Diabetes Control': [
    'Not Addressed',
    'HgbA1c ordered',
    'HgbA1c at goal',
    'HgbA1c NOT at goal',
    'Patient declined',
    'No longer applicable',
  ],
  'Annual Serum K&Cr': [
    'Not Addressed',
    'Lab ordered',
    'Lab completed',
    'Patient declined',
    'No longer applicable',
  ],
  'Chronic Diagnosis Code': [
    'Not Addressed',
    'Chronic diagnosis confirmed',
    'Chronic diagnosis resolved',
    'Chronic diagnosis invalid',
    'No longer applicable',
  ],
};

// Measure Status → Tracking #1 mapping
export const STATUS_TO_TRACKING1: Record<string, string[]> = {
  'Colon cancer screening ordered': ['Colonoscopy', 'Sigmoidoscopy', 'Cologuard', 'FOBT'],
  'Colon cancer screening completed': ['Colonoscopy', 'Sigmoidoscopy', 'Cologuard', 'FOBT'],
  'Screening test ordered': ['Mammogram', 'Breast Ultrasound', 'Breast MRI'],
  'Screening test completed': ['Mammogram', 'Breast Ultrasound', 'Breast MRI'],
  'Scheduled call back - BP not at goal': [
    'Call every 1 wk',
    'Call every 2 wks',
    'Call every 3 wks',
    'Call every 4 wks',
    'Call every 5 wks',
    'Call every 6 wks',
    'Call every 7 wks',
    'Call every 8 wks',
  ],
  'Scheduled call back - BP at goal': [
    'Call every 1 wk',
    'Call every 2 wks',
    'Call every 3 wks',
    'Call every 4 wks',
    'Call every 5 wks',
    'Call every 6 wks',
    'Call every 7 wks',
    'Call every 8 wks',
  ],
  'Chronic diagnosis resolved': ['Attestation not sent', 'Attestation sent'],
  'Chronic diagnosis invalid': ['Attestation not sent', 'Attestation sent'],
  'Screening discussed': ['In 1 Month', 'In 2 Months', 'In 3 Months', 'In 4 Months'],
};

// Request Types list
export const REQUEST_TYPES = ['AWV', 'Chronic DX', 'Quality', 'Screening'];

// Helper functions
export function getQualityMeasuresForRequestType(requestType: string): string[] {
  return REQUEST_TYPE_TO_QUALITY_MEASURE[requestType] || [];
}

export function getMeasureStatusesForQualityMeasure(qualityMeasure: string): string[] {
  return QUALITY_MEASURE_TO_STATUS[qualityMeasure] || ['Not Addressed'];
}

export function getTracking1OptionsForStatus(measureStatus: string): string[] | null {
  return STATUS_TO_TRACKING1[measureStatus] || null;
}

// Check if Request Type has single Quality Measure (auto-fill)
export function shouldAutoFillQualityMeasure(requestType: string): boolean {
  const measures = REQUEST_TYPE_TO_QUALITY_MEASURE[requestType];
  return measures && measures.length === 1;
}

// Get auto-fill value for Quality Measure
export function getAutoFillQualityMeasure(requestType: string): string | null {
  const measures = REQUEST_TYPE_TO_QUALITY_MEASURE[requestType];
  if (measures && measures.length === 1) {
    return measures[0];
  }
  return null;
}
