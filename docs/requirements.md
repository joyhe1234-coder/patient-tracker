# Patient Quality Measure Tracking System
## Complete Implementation Documentation (Final Version)

**Version:** 2.3  
**Date:** January 2025  
**Status:** FINAL - Includes HgbA1c, Excel-like Behaviors & Data Preservation  

---

# Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Backend API](#5-backend-api)
6. [Frontend Components](#6-frontend-components)
7. [Excel-like Behaviors](#7-excel-like-behaviors) ← **NEW**
8. [Configuration Data](#8-configuration-data)
9. [Business Logic Implementation](#9-business-logic-implementation)
10. [Real-time Features](#10-real-time-features)
11. [Admin Panel](#11-admin-panel)
12. [Docker Deployment & Data Preservation](#12-docker-deployment--data-preservation) ← **EXPANDED**
13. [Testing Strategy](#13-testing-strategy)
14. [Implementation Phases](#14-implementation-phases)

---

# 1. Project Overview

## 1.1 Purpose
A web-based patient quality measure tracking application for medical offices, replacing an Excel-based system with a multi-user web application.

## 1.2 Key Features
- Excel-like grid interface with 14 columns
- Cascading dropdown dependencies
- Real-time collaboration (view) with single-editor locking
- Automatic calculations and business rule enforcement
- **Auto-save on cell edit** (Excel-like behavior)
- **Auto-formatting for phone numbers and dates**
- CSV import/export
- Admin panel for user management
- Reference data sheets (HCC Codes, P4P Guidelines)
- HgbA1c Goal Configuration with special color logic

## 1.3 Users
- **Viewers**: Anyone on the internal network (no login required)
- **Editors**: Authenticated users who can modify data (one at a time)
- **Admin**: Can manage editor accounts and force-release edit locks

---

# 2. Technology Stack

## 2.1 Backend
```
- Runtime: Node.js 20 LTS
- Framework: Express.js 4.x
- Database: PostgreSQL 16
- ORM: Prisma
- WebSocket: Socket.io
- Authentication: JWT (jsonwebtoken)
- Validation: Zod
- CSV Processing: Papa Parse
```

## 2.2 Frontend
```
- Framework: React 18 with Vite
- Grid: AG Grid Community Edition
- Styling: Tailwind CSS
- State Management: Zustand
- WebSocket Client: Socket.io-client
- HTTP Client: Axios
- Forms: React Hook Form
- Icons: Lucide React
- Date Picker: react-datepicker
- Input Masking: react-input-mask (for phone formatting)
```

## 2.3 Infrastructure
```
- Containerization: Docker + Docker Compose
- Reverse Proxy: Nginx
- OS: Windows Server (Docker Desktop) or Linux
```

---

# 3. Project Structure

```
patient-tracker/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
│
├── config/
│   ├── editors.json          # Editor credentials (managed by admin UI)
│   └── admin.json            # Admin password
│
├── nginx/
│   └── nginx.conf
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts           # Seed configuration data
│   └── src/
│       ├── index.ts          # Entry point
│       ├── app.ts            # Express app setup
│       ├── socket.ts         # Socket.io setup
│       ├── config/
│       │   ├── index.ts
│       │   └── credentials.ts    # Load/watch editors.json
│       ├── middleware/
│       │   ├── auth.ts           # JWT verification
│       │   ├── editorLock.ts     # Verify edit lock ownership
│       │   └── errorHandler.ts
│       ├── routes/
│       │   ├── index.ts
│       │   ├── auth.routes.ts
│       │   ├── patients.routes.ts
│       │   ├── measures.routes.ts
│       │   ├── config.routes.ts
│       │   ├── import-export.routes.ts
│       │   ├── lock.routes.ts
│       │   └── admin.routes.ts
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── patients.controller.ts
│       │   ├── measures.controller.ts
│       │   ├── config.controller.ts
│       │   ├── importExport.controller.ts
│       │   ├── lock.controller.ts
│       │   └── admin.controller.ts
│       ├── services/
│       │   ├── patient.service.ts
│       │   ├── measure.service.ts
│       │   ├── config.service.ts
│       │   ├── lock.service.ts
│       │   ├── calculation.service.ts   # Due date calculations
│       │   ├── hgba1c.service.ts        # HgbA1c goal calculations
│       │   ├── formatting.service.ts    # Phone/date formatting (NEW)
│       │   ├── validation.service.ts    # Business rule validation
│       │   └── csv.service.ts
│       ├── types/
│       │   └── index.ts
│       └── utils/
│           ├── logger.ts
│           ├── helpers.ts
│           └── formatters.ts            # Phone/date formatters (NEW)
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── api/
│       │   ├── axios.ts
│       │   ├── auth.api.ts
│       │   ├── patients.api.ts
│       │   ├── measures.api.ts
│       │   ├── config.api.ts
│       │   └── admin.api.ts
│       ├── stores/
│       │   ├── authStore.ts
│       │   ├── gridStore.ts
│       │   ├── configStore.ts
│       │   ├── lockStore.ts
│       │   └── undoStore.ts             # Undo/redo state (NEW)
│       ├── hooks/
│       │   ├── useSocket.ts
│       │   ├── useEditLock.ts
│       │   ├── useGridData.ts
│       │   ├── useAutoSave.ts           # Auto-save hook (NEW)
│       │   ├── useUndoRedo.ts           # Undo/redo hook (NEW)
│       │   └── useKeyboardNav.ts        # Keyboard navigation (NEW)
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Header.tsx
│       │   │   ├── Toolbar.tsx
│       │   │   └── StatusBar.tsx
│       │   ├── grid/
│       │   │   ├── PatientGrid.tsx
│       │   │   ├── cellRenderers/
│       │   │   │   ├── DropdownCell.tsx
│       │   │   │   ├── DateCell.tsx
│       │   │   │   ├── PhoneCell.tsx    # Phone formatting (NEW)
│       │   │   │   └── TextCell.tsx
│       │   │   ├── cellEditors/
│       │   │   │   ├── DropdownEditor.tsx
│       │   │   │   ├── DateEditor.tsx
│       │   │   │   ├── PhoneEditor.tsx  # Phone input mask (NEW)
│       │   │   │   └── TextEditor.tsx
│       │   │   ├── columnDefs.ts
│       │   │   └── gridConfig.ts        # Grid behavior config (NEW)
│       │   ├── modals/
│       │   │   ├── LoginModal.tsx
│       │   │   ├── ImportModal.tsx
│       │   │   ├── ExportModal.tsx
│       │   │   ├── ConfirmModal.tsx
│       │   │   └── FindReplaceModal.tsx # Find/replace (NEW)
│       │   ├── reference/
│       │   │   ├── HCCCodeList.tsx
│       │   │   ├── P4PGuidelines.tsx
│       │   │   └── P4PCodes.tsx
│       │   └── admin/
│       │       ├── AdminLogin.tsx
│       │       ├── AdminPanel.tsx
│       │       ├── EditorList.tsx
│       │       ├── EditorForm.tsx
│       │       └── AdminSettings.tsx
│       ├── pages/
│       │   ├── MainPage.tsx
│       │   ├── ReferencePage.tsx
│       │   └── AdminPage.tsx
│       ├── utils/
│       │   ├── formatting.ts            # Phone/date formatters (NEW)
│       │   ├── validation.ts
│       │   └── constants.ts
│       └── types/
│           └── index.ts
│
├── scripts/
│   ├── backup.ps1            # Windows backup script
│   ├── backup.sh             # Linux backup script
│   ├── restore.ps1
│   ├── restore.sh
│   └── install.ps1
│
└── docs/
    ├── INSTALLATION.md
    ├── USER_GUIDE.md
    └── ADMIN_GUIDE.md
```

---

# 4. Database Schema

## 4.1 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// PATIENT DATA
// ============================================

model Patient {
  id              Int              @id @default(autoincrement())
  memberName      String           @map("member_name")
  memberDob       DateTime         @map("member_dob") @db.Date
  memberTelephone String?          @map("member_telephone")
  memberAddress   String?          @map("member_address")
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  measures        PatientMeasure[]

  @@unique([memberName, memberDob])
  @@map("patients")
}

model PatientMeasure {
  id                     Int       @id @default(autoincrement())
  patientId              Int       @map("patient_id")
  patient                Patient   @relation(fields: [patientId], references: [id], onDelete: Cascade)
  requestType            String    @map("request_type")
  qualityMeasure         String    @map("quality_measure")
  measureStatus          String    @map("measure_status") @default("Not Addressed")
  statusDate             DateTime? @map("status_date") @db.Date
  statusDatePrompt       String?   @map("status_date_prompt")
  tracking1              String?   @map("tracking_1")
  tracking2              String?   @map("tracking_2")
  tracking3              String?   @map("tracking_3")
  dueDate                DateTime? @map("due_date") @db.Date
  timeIntervalDays       Int?      @map("time_interval_days")
  notes                  String?
  rowOrder               Int       @default(0) @map("row_order")
  isDuplicate            Boolean   @default(false) @map("is_duplicate")
  
  // HgbA1c Goal Configuration Fields
  hgba1cGoal             String?   @map("hgba1c_goal")
  hgba1cGoalReachedYear  Boolean   @default(false) @map("hgba1c_goal_reached_year")
  hgba1cDeclined         Boolean   @default(false) @map("hgba1c_declined")
  
  createdAt              DateTime  @default(now()) @map("created_at")
  updatedAt              DateTime  @updatedAt @map("updated_at")

  @@index([patientId])
  @@index([qualityMeasure])
  @@index([measureStatus])
  @@index([dueDate])
  @@map("patient_measures")
}

// ============================================
// CONFIGURATION DATA
// ============================================

model RequestType {
  id                 Int              @id @default(autoincrement())
  code               String           @unique
  label              String
  autoQualityMeasure String?          @map("auto_quality_measure")
  sortOrder          Int              @default(0) @map("sort_order")
  qualityMeasures    QualityMeasure[]

  @@map("config_request_types")
}

model QualityMeasure {
  id              Int             @id @default(autoincrement())
  requestTypeId   Int             @map("request_type_id")
  requestType     RequestType     @relation(fields: [requestTypeId], references: [id])
  code            String
  label           String
  allowDuplicates Boolean         @default(false) @map("allow_duplicates")
  sortOrder       Int             @default(0) @map("sort_order")
  measureStatuses MeasureStatus[]

  @@unique([requestTypeId, code])
  @@map("config_quality_measures")
}

model MeasureStatus {
  id               Int              @id @default(autoincrement())
  qualityMeasureId Int              @map("quality_measure_id")
  qualityMeasure   QualityMeasure   @relation(fields: [qualityMeasureId], references: [id])
  code             String
  label            String
  datePrompt       String?          @map("date_prompt")
  baseDueDays      Int?             @map("base_due_days")
  showDueDateInput Boolean          @default(false) @map("show_due_date_input")
  sortOrder        Int              @default(0) @map("sort_order")
  trackingOptions  TrackingOption[]
  dueDayRules      DueDayRule[]

  @@unique([qualityMeasureId, code])
  @@map("config_measure_statuses")
}

model TrackingOption {
  id              Int           @id @default(autoincrement())
  measureStatusId Int           @map("measure_status_id")
  measureStatus   MeasureStatus @relation(fields: [measureStatusId], references: [id])
  trackingNumber  Int           @map("tracking_number") // 1, 2, or 3
  optionValue     String?       @map("option_value")    // null = free text
  defaultText     String?       @map("default_text")    // placeholder text
  sortOrder       Int           @default(0) @map("sort_order")

  @@map("config_tracking_options")
}

model DueDayRule {
  id              Int           @id @default(autoincrement())
  measureStatusId Int           @map("measure_status_id")
  measureStatus   MeasureStatus @relation(fields: [measureStatusId], references: [id])
  trackingValue   String?       @map("tracking_value")  // null = use base_due_days
  dueDays         Int           @map("due_days")

  @@unique([measureStatusId, trackingValue])
  @@map("config_due_day_rules")
}

// HgbA1c Goal Configuration
model HgbA1cGoalOption {
  id          Int     @id @default(autoincrement())
  code        String  @unique
  label       String
  threshold   Decimal @db.Decimal(3, 1)
  sortOrder   Int     @default(0) @map("sort_order")

  @@map("config_hgba1c_goals")
}

// ============================================
// CONDITIONAL FORMATTING
// ============================================

model ConditionalFormat {
  id              Int    @id @default(autoincrement())
  name            String
  conditionType   String @map("condition_type")
  conditionValue  String @map("condition_value")
  backgroundColor String @map("background_color")
  textColor       String @default("#000000") @map("text_color")
  priority        Int    @default(0)

  @@map("config_conditional_formats")
}

// ============================================
// REFERENCE DATA
// ============================================

model HCCCode {
  id          Int     @id @default(autoincrement())
  category    String
  description String
  icd10Code   String  @map("icd10_code")
  rafValue    Decimal @map("raf_value") @db.Decimal(5, 3)
  sortOrder   Int     @default(0) @map("sort_order")

  @@map("reference_hcc_codes")
}

// ============================================
// SYSTEM
// ============================================

model EditLock {
  id              Int       @id @default(1)
  lockedByUsername String?   @map("locked_by_username")
  lockedByDisplayName String? @map("locked_by_display_name")
  lockedAt        DateTime? @map("locked_at")
  lastActivity    DateTime? @map("last_activity")

  @@map("edit_lock")
}

model AuditLog {
  id        Int      @id @default(autoincrement())
  username  String?
  action    String
  details   Json?
  ipAddress String?  @map("ip_address")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([createdAt])
  @@index([username])
  @@map("audit_log")
}
```

---

# 5. Backend API

## 5.1 API Endpoints

### Authentication
```
POST   /api/auth/login          # Editor login (returns JWT)
POST   /api/auth/logout         # Editor logout
GET    /api/auth/me             # Get current user info
```

### Patient Data (Combined View)
```
GET    /api/data                # Get all patient measures (grid data)
POST   /api/data                # Create new row
PUT    /api/data/:id            # Update row (auto-save endpoint)
DELETE /api/data/:id            # Delete row
POST   /api/data/batch          # Batch update (for paste operations)
PUT    /api/data/reorder        # Update row order
POST   /api/data/undo/:id       # Undo last change for a row
```

### Configuration
```
GET    /api/config/request-types
GET    /api/config/quality-measures/:requestTypeId
GET    /api/config/measure-statuses/:qualityMeasureId
GET    /api/config/tracking-options/:measureStatusId
GET    /api/config/conditional-formats
GET    /api/config/hgba1c-goals
GET    /api/config/all
```

### Import/Export
```
POST   /api/import              # Import CSV (multipart/form-data)
GET    /api/export              # Export CSV
```

### Edit Lock
```
GET    /api/lock                # Get current lock status
POST   /api/lock/acquire        # Acquire edit lock (requires auth)
POST   /api/lock/release        # Release edit lock
POST   /api/lock/heartbeat      # Keep lock alive
```

### Reference Data
```
GET    /api/reference/hcc-codes
GET    /api/reference/p4p-guidelines
GET    /api/reference/p4p-codes
```

### Admin
```
POST   /api/admin/login
GET    /api/admin/editors
POST   /api/admin/editors
PUT    /api/admin/editors/:username
DELETE /api/admin/editors/:username
PUT    /api/admin/password
DELETE /api/admin/lock
GET    /api/admin/audit-log
```

### Health
```
GET    /api/health
```

## 5.2 API Response Format

```typescript
// Success response
{
  "success": true,
  "data": { ... }
}

// Error response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}

// Validation error response (for auto-formatting)
{
  "success": true,
  "data": { ... },
  "formatted": {
    "memberTelephone": "(555) 123-4567",  // Formatted value
    "memberDob": "1960-05-15"             // Normalized date
  },
  "warnings": [
    "Phone number was reformatted"
  ]
}
```

---

# 6. Frontend Components

## 6.1 Main Grid Component (PatientGrid.tsx)

```typescript
// Column definitions for AG Grid
const columnDefs: ColDef[] = [
  {
    field: 'requestType',
    headerName: 'Request Type',
    width: 120,
    cellEditor: 'dropdownEditor',
    cellEditorParams: {
      values: () => configStore.requestTypes.map(rt => rt.code)
    },
    editable: (params) => lockStore.isEditor
  },
  {
    field: 'memberName',
    headerName: 'Member Name',
    width: 180,
    editable: (params) => lockStore.isEditor
  },
  {
    field: 'memberDob',
    headerName: 'Member DOB',
    width: 120,
    cellEditor: 'dateEditor',
    cellEditorParams: {
      dateFormat: 'MM/dd/yyyy',
      minDate: new Date('1900-01-01'),
      maxDate: new Date()
    },
    valueFormatter: (params) => formatDate(params.value),
    valueParser: (params) => parseDate(params.newValue), // Auto-parse various formats
    editable: (params) => lockStore.isEditor
  },
  {
    field: 'memberTelephone',
    headerName: 'Member Telephone',
    width: 130,
    cellEditor: 'phoneEditor',
    cellRenderer: 'phoneCell',
    valueFormatter: (params) => formatPhoneNumber(params.value),
    valueParser: (params) => parsePhoneNumber(params.newValue), // Auto-format
    hide: !showPhoneAddress,
    editable: (params) => lockStore.isEditor
  },
  {
    field: 'memberAddress',
    headerName: 'Member Home Address',
    width: 200,
    hide: !showPhoneAddress,
    editable: (params) => lockStore.isEditor
  },
  {
    field: 'qualityMeasure',
    headerName: 'Quality Measure',
    width: 180,
    cellEditor: 'dropdownEditor',
    cellEditorParams: (params) => ({
      values: getQualityMeasuresForRequestType(params.data.requestType)
    }),
    editable: (params) => lockStore.isEditor
  },
  {
    field: 'measureStatus',
    headerName: 'Measure Status',
    width: 220,
    cellEditor: 'dropdownEditor',
    cellEditorParams: (params) => ({
      values: getMeasureStatusesForQualityMeasure(params.data.qualityMeasure)
    }),
    editable: (params) => lockStore.isEditor
  },
  {
    field: 'statusDate',
    headerName: 'Date',
    width: 130,
    cellRenderer: 'dateCell',
    cellEditor: 'dateEditor',
    valueFormatter: (params) => {
      if (!params.value && params.data.statusDatePrompt) {
        return params.data.statusDatePrompt;
      }
      return formatDate(params.value);
    },
    valueParser: (params) => parseDate(params.newValue),
    editable: (params) => lockStore.isEditor
  },
  {
    field: 'tracking1',
    headerName: 'Tracking#1',
    width: 150,
    cellEditor: 'dynamicEditor',
    cellEditorParams: (params) => getTrackingEditorParams(params.data.measureStatus, 1),
    editable: (params) => lockStore.isEditor && hasTrackingField(params.data.measureStatus, 1)
  },
  {
    field: 'tracking2',
    headerName: 'Tracking#2',
    width: 150,
    cellEditor: 'dynamicEditor',
    cellEditorParams: (params) => getTrackingEditorParams(params.data.measureStatus, 2),
    editable: (params) => lockStore.isEditor && hasTrackingField(params.data.measureStatus, 2)
  },
  {
    field: 'tracking3',
    headerName: 'Tracking#3',
    width: 150,
    cellEditor: 'dynamicEditor',
    cellEditorParams: (params) => getTrackingEditorParams(params.data.measureStatus, 3),
    editable: (params) => lockStore.isEditor && hasTrackingField(params.data.measureStatus, 3)
  },
  {
    field: 'dueDate',
    headerName: 'Due Date',
    width: 120,
    valueFormatter: (params) => formatDate(params.value),
    cellStyle: (params) => getDueDateStyle(params.value),
    editable: false // Calculated field
  },
  {
    field: 'timeIntervalDays',
    headerName: 'Time Interval (Days)',
    width: 130,
    editable: false // Calculated field
  },
  {
    field: 'notes',
    headerName: 'Possible Actions Needed & Notes',
    width: 300,
    editable: (params) => lockStore.isEditor
  }
];
```

---

# 7. Excel-like Behaviors

This section documents all Excel-like behaviors that the application must support to provide a familiar user experience.

## 7.1 Auto-Save Behavior

### Immediate Save on Cell Exit
```typescript
// When user finishes editing a cell, data is saved immediately
const onCellValueChanged = async (event: CellValueChangedEvent) => {
  const { data, colDef, newValue, oldValue } = event;
  
  // Don't save if value hasn't changed
  if (newValue === oldValue) return;
  
  // Show saving indicator
  setSaveStatus('saving');
  
  try {
    // Save to backend immediately
    await api.updateRow(data.id, { [colDef.field]: newValue });
    
    // Show saved confirmation briefly
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
    
  } catch (error) {
    // Revert to old value on error
    event.node.setDataValue(colDef.field, oldValue);
    showError('Failed to save changes');
    setSaveStatus('error');
  }
};
```

### Save Status Indicator
| Status | Display | Color |
|--------|---------|-------|
| Idle | No indicator | - |
| Saving | "Saving..." with spinner | Yellow |
| Saved | "✓ Saved" | Green |
| Error | "⚠ Save failed" | Red |

### Debounced Save for Text Fields
```typescript
// For text fields, debounce saves to avoid excessive API calls
const debouncedSave = useMemo(
  () => debounce(async (id: number, field: string, value: string) => {
    await api.updateRow(id, { [field]: value });
  }, 500),
  []
);
```

## 7.2 Data Formatting

### Phone Number Auto-Formatting

**Input Formats Accepted:**
| User Input | Formatted Output |
|------------|------------------|
| `5551234567` | `(555) 123-4567` |
| `555-123-4567` | `(555) 123-4567` |
| `555.123.4567` | `(555) 123-4567` |
| `555 123 4567` | `(555) 123-4567` |
| `+1 555 123 4567` | `(555) 123-4567` |
| `1-555-123-4567` | `(555) 123-4567` |

**Implementation:**
```typescript
// utils/formatting.ts
export function formatPhoneNumber(value: string | null): string {
  if (!value) return '';
  
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Remove leading 1 if present (US country code)
  const normalized = digits.startsWith('1') && digits.length === 11 
    ? digits.slice(1) 
    : digits;
  
  // Format as (XXX) XXX-XXXX
  if (normalized.length === 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  
  // Return as-is if not valid 10 digits
  return value;
}

export function parsePhoneNumber(value: string): string {
  // Store normalized digits only
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('1') && digits.length === 11 
    ? digits.slice(1) 
    : digits;
}

export function validatePhoneNumber(value: string): { valid: boolean; error?: string } {
  const digits = value.replace(/\D/g, '');
  const normalized = digits.startsWith('1') && digits.length === 11 
    ? digits.slice(1) 
    : digits;
  
  if (normalized.length === 0) {
    return { valid: true }; // Empty is allowed
  }
  
  if (normalized.length !== 10) {
    return { valid: false, error: 'Phone number must be 10 digits' };
  }
  
  return { valid: true };
}
```

### Date Auto-Formatting

**Input Formats Accepted:**
| User Input | Parsed As |
|------------|-----------|
| `1/5/1960` | `01/05/1960` |
| `01/05/1960` | `01/05/1960` |
| `1-5-1960` | `01/05/1960` |
| `01-05-1960` | `01/05/1960` |
| `1.5.1960` | `01/05/1960` |
| `1/5/60` | `01/05/1960` (assumes 1900s for year > 25) |
| `1/5/25` | `01/05/2025` (assumes 2000s for year <= 25) |
| `Jan 5, 1960` | `01/05/1960` |
| `January 5, 1960` | `01/05/1960` |
| `1960-01-05` | `01/05/1960` (ISO format) |

**Display Format:** `MM/DD/YYYY`

**Implementation:**
```typescript
// utils/formatting.ts
import { parse, format, isValid } from 'date-fns';

const DATE_FORMATS = [
  'M/d/yyyy',
  'MM/dd/yyyy',
  'M-d-yyyy',
  'MM-dd-yyyy',
  'M.d.yyyy',
  'MM.dd.yyyy',
  'M/d/yy',
  'MM/dd/yy',
  'MMM d, yyyy',
  'MMMM d, yyyy',
  'yyyy-MM-dd',
];

export function parseDate(value: string): Date | null {
  if (!value) return null;
  
  // Try each format
  for (const fmt of DATE_FORMATS) {
    const parsed = parse(value, fmt, new Date());
    if (isValid(parsed)) {
      // Handle 2-digit year
      if (parsed.getFullYear() < 100) {
        const year = parsed.getFullYear();
        parsed.setFullYear(year > 25 ? 1900 + year : 2000 + year);
      }
      return parsed;
    }
  }
  
  return null;
}

export function formatDate(value: Date | string | null): string {
  if (!value) return '';
  
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!isValid(date)) return '';
  
  return format(date, 'MM/dd/yyyy');
}

export function validateDate(value: string, options?: {
  minDate?: Date;
  maxDate?: Date;
  allowFuture?: boolean;
}): { valid: boolean; error?: string } {
  const date = parseDate(value);
  
  if (!date) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  if (options?.minDate && date < options.minDate) {
    return { valid: false, error: `Date cannot be before ${formatDate(options.minDate)}` };
  }
  
  if (options?.maxDate && date > options.maxDate) {
    return { valid: false, error: `Date cannot be after ${formatDate(options.maxDate)}` };
  }
  
  if (options?.allowFuture === false && date > new Date()) {
    return { valid: false, error: 'Date cannot be in the future' };
  }
  
  return { valid: true };
}
```

### Date Field Validation Rules

| Field | Future Dates Allowed | Min Date | Max Date |
|-------|---------------------|----------|----------|
| Member DOB | No | 1900-01-01 | Today |
| Status Date (completed) | No | 1900-01-01 | Today |
| Status Date (scheduled) | Yes | Today | +2 years |
| Due Date | Yes | Today | +2 years |

## 7.3 Keyboard Navigation

### Cell Navigation
| Key | Action |
|-----|--------|
| `Tab` | Move to next cell (right), wrap to next row |
| `Shift + Tab` | Move to previous cell (left), wrap to previous row |
| `Enter` | Confirm edit and move down |
| `Shift + Enter` | Confirm edit and move up |
| `Arrow Keys` | Move in direction (when not editing) |
| `Home` | Move to first cell in row |
| `End` | Move to last cell in row |
| `Ctrl + Home` | Move to first cell (A1) |
| `Ctrl + End` | Move to last cell with data |
| `Page Up` | Scroll up one page |
| `Page Down` | Scroll down one page |

### Editing
| Key | Action |
|-----|--------|
| `F2` | Enter edit mode on selected cell |
| `Enter` | Enter edit mode OR confirm edit |
| `Escape` | Cancel edit, revert to original value |
| `Delete` | Clear cell contents |
| `Backspace` | Clear cell and enter edit mode |
| Any character | Start editing with that character |

### Selection
| Key | Action |
|-----|--------|
| `Shift + Arrow` | Extend selection |
| `Shift + Click` | Select range from current to clicked cell |
| `Ctrl + Click` | Add cell to selection (multi-select) |
| `Ctrl + A` | Select all cells |
| `Ctrl + Shift + End` | Select from current to last cell |

### Implementation:
```typescript
// AG Grid keyboard navigation config
const gridOptions: GridOptions = {
  navigateToNextCell: (params) => {
    const { key, previousCellPosition, nextCellPosition } = params;
    
    // Custom Tab behavior - skip non-editable cells
    if (key === 'Tab') {
      let next = nextCellPosition;
      while (next && !isCellEditable(next)) {
        next = getNextCell(next, params.backwards);
      }
      return next;
    }
    
    return nextCellPosition;
  },
  
  tabToNextCell: (params) => {
    // Move to next editable cell
    return findNextEditableCell(params.previousCellPosition, params.backwards);
  },
  
  enterNavigatesVertically: true,
  enterNavigatesVerticallyAfterEdit: true,
  
  // Enable keyboard navigation
  suppressKeyboardEvent: (params) => {
    // Don't suppress standard navigation keys
    return false;
  }
};
```

## 7.4 Copy and Paste

### Single Cell Copy/Paste
| Action | Behavior |
|--------|----------|
| `Ctrl + C` | Copy selected cell value to clipboard |
| `Ctrl + V` | Paste clipboard value into selected cell |
| `Ctrl + X` | Cut (copy and clear) selected cell |

### Range Copy/Paste
| Action | Behavior |
|--------|----------|
| `Ctrl + C` on range | Copy all selected cells (tab-separated) |
| `Ctrl + V` on range | Paste starting from selected cell |

### Paste Behavior Rules
1. **Single cell to single cell**: Direct paste
2. **Single cell to range**: Fill all selected cells with same value
3. **Range to single cell**: Paste starting from selected cell, expand as needed
4. **Range to range**: 
   - If same size: Direct paste
   - If different size: Paste starting from top-left of selection

### Paste Validation
```typescript
const handlePaste = async (event: CellEvent) => {
  const clipboardData = event.clipboardData.getData('text');
  const rows = clipboardData.split('\n').map(row => row.split('\t'));
  
  const validationErrors: string[] = [];
  const formattedData: any[][] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const formattedRow = [];
    for (let j = 0; j < rows[i].length; j++) {
      const targetColumn = getColumnAtIndex(event.column.colId, j);
      const value = rows[i][j];
      
      // Validate and format based on column type
      const { formatted, error } = validateAndFormat(targetColumn, value);
      
      if (error) {
        validationErrors.push(`Row ${i + 1}, Col ${j + 1}: ${error}`);
      }
      
      formattedRow.push(formatted);
    }
    formattedData.push(formattedRow);
  }
  
  if (validationErrors.length > 0) {
    showWarning(`Some values were adjusted:\n${validationErrors.join('\n')}`);
  }
  
  // Apply formatted data
  applyPastedData(formattedData, event.rowIndex, event.column.colId);
};
```

### Clipboard Format (Export)
When copying, format values for readability:
- Dates: `MM/DD/YYYY`
- Phone: `(555) 123-4567`
- Booleans: `Yes` / `No`

## 7.5 Undo and Redo

### Undo/Redo Stack
```typescript
// stores/undoStore.ts
interface UndoState {
  undoStack: CellChange[];
  redoStack: CellChange[];
  maxStackSize: number; // Default: 50
}

interface CellChange {
  id: number;           // Row ID
  field: string;        // Column field name
  oldValue: any;        // Previous value
  newValue: any;        // New value
  timestamp: Date;      // When change was made
}

const useUndoStore = create<UndoState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxStackSize: 50,
  
  pushChange: (change: CellChange) => {
    set((state) => ({
      undoStack: [...state.undoStack, change].slice(-state.maxStackSize),
      redoStack: [] // Clear redo stack on new change
    }));
  },
  
  undo: async () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;
    
    const change = undoStack[undoStack.length - 1];
    
    // Revert the change
    await api.updateRow(change.id, { [change.field]: change.oldValue });
    
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, change]
    }));
  },
  
  redo: async () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;
    
    const change = redoStack[redoStack.length - 1];
    
    // Reapply the change
    await api.updateRow(change.id, { [change.field]: change.newValue });
    
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, change]
    }));
  },
  
  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
}));
```

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Ctrl + Z` | Undo last change |
| `Ctrl + Y` | Redo last undone change |
| `Ctrl + Shift + Z` | Redo (alternative) |

### Undo Scope
- Undo is **per-session** (clears on page refresh)
- Undo is **per-user** (only your own changes)
- Maximum 50 changes in undo stack

## 7.6 Row Operations

### Adding Rows
| Action | Method |
|--------|--------|
| Click "+ Add Row" button | Add blank row at bottom |
| `Ctrl + Shift + +` | Insert row above current |
| Right-click → "Insert Row Above" | Insert row above current |
| Right-click → "Insert Row Below" | Insert row below current |

### Deleting Rows
| Action | Method |
|--------|--------|
| Select row → Press `Delete` | Delete with confirmation |
| Right-click → "Delete Row" | Delete with confirmation |
| `Ctrl + -` | Delete current row with confirmation |

### Row Deletion Confirmation
```typescript
const handleDeleteRow = async (rowId: number) => {
  const confirmed = await showConfirmDialog({
    title: 'Delete Row',
    message: 'Are you sure you want to delete this row? This action cannot be undone.',
    confirmText: 'Delete',
    confirmColor: 'red'
  });
  
  if (confirmed) {
    await api.deleteRow(rowId);
  }
};
```

### Duplicate Row
| Action | Method |
|--------|--------|
| Right-click → "Duplicate Row" | Create copy below current row |
| `Ctrl + D` | Duplicate current row |

## 7.7 Column Operations

### Column Resizing
- Drag column border to resize
- Double-click column border to auto-fit width
- Minimum column width: 50px
- Maximum column width: 500px

### Column Reordering
- Drag column header to reorder
- First 5 columns (Request Type → Address) are locked in position

### Column Visibility
- Click eye icon in toolbar to show/hide columns
- Phone # and Address hidden by default (toggle available)
- Column visibility persists in local storage

### Column Sorting
| Action | Behavior |
|--------|----------|
| Click header | Sort ascending |
| Click header again | Sort descending |
| Click header again | Clear sort |
| `Shift + Click` | Add to multi-sort |

### Column Filtering
| Action | Behavior |
|--------|----------|
| Click filter icon | Open filter popup |
| Type in filter | Filter as you type |
| Select from list | Filter by specific values |
| Clear filter | Show all rows |

```typescript
// Filter configuration
const defaultColDef: ColDef = {
  filter: true,
  filterParams: {
    buttons: ['reset', 'apply'],
    closeOnApply: true,
  },
  sortable: true,
  resizable: true,
};
```

## 7.8 Find and Replace

### Find Dialog (`Ctrl + F`)
```typescript
interface FindOptions {
  searchText: string;
  matchCase: boolean;
  matchWholeCell: boolean;
  searchIn: 'all' | 'column' | 'selection';
  column?: string; // If searchIn === 'column'
}
```

### Replace Dialog (`Ctrl + H`)
```typescript
interface ReplaceOptions extends FindOptions {
  replaceText: string;
}
```

### Find/Replace Actions
| Button | Action |
|--------|--------|
| Find Next | Highlight and scroll to next match |
| Find Previous | Highlight and scroll to previous match |
| Replace | Replace current match and find next |
| Replace All | Replace all matches (with confirmation) |

### Implementation:
```typescript
const findInGrid = (options: FindOptions): CellPosition[] => {
  const matches: CellPosition[] = [];
  
  gridApi.forEachNode((node) => {
    const columns = options.searchIn === 'column' 
      ? [options.column]
      : gridApi.getColumnDefs().map(c => c.field);
    
    columns.forEach(colId => {
      const value = String(node.data[colId] || '');
      const searchValue = options.matchCase 
        ? options.searchText 
        : options.searchText.toLowerCase();
      const cellValue = options.matchCase 
        ? value 
        : value.toLowerCase();
      
      const matches = options.matchWholeCell
        ? cellValue === searchValue
        : cellValue.includes(searchValue);
      
      if (matches) {
        matches.push({ rowIndex: node.rowIndex, colId });
      }
    });
  });
  
  return matches;
};
```

## 7.9 Context Menu (Right-Click)

### Cell Context Menu
```
┌─────────────────────────┐
│ Cut              Ctrl+X │
│ Copy             Ctrl+C │
│ Paste            Ctrl+V │
├─────────────────────────┤
│ Insert Row Above        │
│ Insert Row Below        │
│ Duplicate Row    Ctrl+D │
│ Delete Row              │
├─────────────────────────┤
│ Clear Cell              │
│ Clear Row               │
├─────────────────────────┤
│ Filter by this value    │
│ Sort Ascending          │
│ Sort Descending         │
└─────────────────────────┘
```

### Implementation:
```typescript
const getContextMenuItems = (params: GetContextMenuItemsParams): MenuItem[] => {
  const { node, column, value } = params;
  
  return [
    {
      name: 'Cut',
      shortcut: 'Ctrl+X',
      action: () => cutCell(node, column),
      icon: '<i class="fa fa-cut"></i>',
    },
    {
      name: 'Copy',
      shortcut: 'Ctrl+C',
      action: () => copyCell(node, column),
      icon: '<i class="fa fa-copy"></i>',
    },
    {
      name: 'Paste',
      shortcut: 'Ctrl+V',
      action: () => pasteCell(node, column),
      icon: '<i class="fa fa-paste"></i>',
      disabled: !hasClipboardData(),
    },
    'separator',
    {
      name: 'Insert Row Above',
      action: () => insertRowAbove(node.rowIndex),
    },
    {
      name: 'Insert Row Below',
      action: () => insertRowBelow(node.rowIndex),
    },
    {
      name: 'Duplicate Row',
      shortcut: 'Ctrl+D',
      action: () => duplicateRow(node),
    },
    {
      name: 'Delete Row',
      action: () => deleteRow(node),
      cssClasses: ['text-red-600'],
    },
    'separator',
    {
      name: 'Filter by this value',
      action: () => filterByValue(column, value),
    },
    {
      name: 'Sort Ascending',
      action: () => sortColumn(column, 'asc'),
    },
    {
      name: 'Sort Descending',
      action: () => sortColumn(column, 'desc'),
    },
  ];
};
```

## 7.10 Visual Feedback

### Cell Edit Indicators
| State | Visual |
|-------|--------|
| Being edited | Yellow border, white background |
| Recently saved | Brief green flash |
| Save failed | Red border, error tooltip |
| Invalid value | Red border, validation message |

### Row Indicators
| State | Visual |
|-------|--------|
| Selected | Blue highlight |
| Being edited by you | Light yellow background |
| Recently added | Brief green highlight |
| Marked for deletion | Strikethrough, red tint |

### Dirty Cell Indicator
```typescript
// Show asterisk or dot for unsaved changes
const cellRenderer = (params: ICellRendererParams) => {
  const isDirty = pendingChanges.has(`${params.data.id}-${params.colDef.field}`);
  
  return (
    <div className="flex items-center">
      <span>{params.value}</span>
      {isDirty && <span className="text-yellow-500 ml-1">●</span>}
    </div>
  );
};
```

## 7.11 Auto-Complete / Type-Ahead

### For Text Fields
```typescript
// Auto-complete for Member Name based on existing patients
const memberNameEditor: ICellEditorParams = {
  cellEditor: 'agTextCellEditor',
  cellEditorParams: {
    useFormatter: true,
  },
  // Show suggestions from existing patients
  cellEditorPopup: true,
  cellEditorPopupPosition: 'under',
};

// Get suggestions
const getMemberNameSuggestions = (searchText: string): string[] => {
  const allNames = gridApi.getRenderedNodes()
    .map(node => node.data.memberName)
    .filter(Boolean);
  
  const unique = [...new Set(allNames)];
  
  return unique
    .filter(name => name.toLowerCase().includes(searchText.toLowerCase()))
    .slice(0, 10);
};
```

### For Dropdown Fields
- Type to filter dropdown options
- First match is highlighted
- Enter to select highlighted option

## 7.12 Freeze Panes

### Pinned Columns
The first 5 columns are pinned (frozen) by default:
1. Request Type
2. Member Name
3. Member DOB
4. Member Telephone
5. Member Home Address

```typescript
const columnDefs: ColDef[] = [
  { field: 'requestType', pinned: 'left' },
  { field: 'memberName', pinned: 'left' },
  { field: 'memberDob', pinned: 'left' },
  { field: 'memberTelephone', pinned: 'left' },
  { field: 'memberAddress', pinned: 'left' },
  // ... rest of columns scroll horizontally
];
```

### Toggle Freeze
- Right-click column header → "Pin Left" / "Pin Right" / "Unpin"
- Or drag column to pinned area

## 7.13 Toolbar Actions

### Toolbar Buttons
```
┌────────────────────────────────────────────────────────────────────┐
│ [+ Add Row] [Undo] [Redo] │ [Find] │ [Import] [Export] │ [Columns] │
└────────────────────────────────────────────────────────────────────┘
```

| Button | Shortcut | Action |
|--------|----------|--------|
| + Add Row | - | Add new blank row |
| Undo | Ctrl+Z | Undo last change |
| Redo | Ctrl+Y | Redo last undone change |
| Find | Ctrl+F | Open find dialog |
| Import | - | Open CSV import dialog |
| Export | - | Export to CSV |
| Columns | - | Show/hide column picker |

## 7.14 Status Bar

### Status Bar Information
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Rows: 1,234 │ Selected: 5 │ Sum: 45 │ Avg: 9 │ ✓ Saved │ Editor: John │
└─────────────────────────────────────────────────────────────────────────┘
```

| Section | Description |
|---------|-------------|
| Rows | Total number of rows |
| Selected | Number of selected cells/rows |
| Sum | Sum of selected numeric cells |
| Avg | Average of selected numeric cells |
| Save Status | Current save state |
| Editor | Current editor name (if editing) |

## 7.15 Unsaved Changes Warning

### Before Navigation/Refresh
```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasPendingChanges()) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, []);
```

### Before Logout
```typescript
const handleLogout = async () => {
  if (hasPendingChanges()) {
    const confirmed = await showConfirmDialog({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Save before logging out?',
      buttons: ['Save & Logout', 'Logout Without Saving', 'Cancel']
    });
    
    if (confirmed === 'Save & Logout') {
      await saveAllPendingChanges();
    } else if (confirmed === 'Cancel') {
      return;
    }
  }
  
  await logout();
};
```

## 7.16 Cell Validation Visual Feedback

### Validation States
| State | Visual Indicator |
|-------|------------------|
| Valid | Normal cell appearance |
| Invalid | Red border, red background tint |
| Warning | Yellow border, yellow background tint |
| Required Empty | Dotted red border |

### Error Tooltip
```typescript
// Show validation error on hover
const cellRenderer = (params: ICellRendererParams) => {
  const validation = validateCell(params.colDef.field, params.value);
  
  return (
    <div 
      className={cn(
        'cell-content',
        !validation.valid && 'border-red-500 bg-red-50',
        validation.warning && 'border-yellow-500 bg-yellow-50'
      )}
      title={validation.error || validation.warning}
    >
      {params.value}
      {!validation.valid && (
        <span className="text-red-500 ml-1">⚠</span>
      )}
    </div>
  );
};
```

### Inline Validation Messages
```typescript
// Show validation message below cell when editing
const cellEditor = (params: ICellEditorParams) => {
  const [value, setValue] = useState(params.value);
  const [error, setError] = useState<string | null>(null);
  
  const handleChange = (newValue: string) => {
    setValue(newValue);
    const validation = validateCell(params.colDef.field, newValue);
    setError(validation.error || null);
  };
  
  return (
    <div className="cell-editor">
      <input value={value} onChange={e => handleChange(e.target.value)} />
      {error && (
        <div className="text-red-500 text-xs mt-1">{error}</div>
      )}
    </div>
  );
};
```

## 7.17 Fill Handle (Auto-Fill)

### Drag to Fill
- Small square handle appears at bottom-right corner of selected cell
- Drag handle down/up to fill adjacent cells
- Fill behavior depends on data type

### Fill Patterns
| Data Type | Fill Behavior |
|-----------|---------------|
| Text | Copy same value |
| Date | Increment by 1 day |
| Number | Copy same value (or increment if pattern detected) |
| Dropdown | Copy same value |

### Implementation
```typescript
const handleFillDrag = (
  sourceCell: CellPosition,
  targetRange: CellRange,
  direction: 'down' | 'up' | 'right' | 'left'
) => {
  const sourceValue = getCellValue(sourceCell);
  const sourceDate = parseDate(sourceValue);
  
  targetRange.forEach((cell, index) => {
    let fillValue = sourceValue;
    
    // Increment dates
    if (sourceDate && isDateColumn(cell.colId)) {
      const increment = direction === 'down' || direction === 'right' ? index + 1 : -(index + 1);
      fillValue = formatDate(addDays(sourceDate, increment));
    }
    
    setCellValue(cell, fillValue);
  });
};
```

### Fill Options Dialog
After drag-fill, show small popup with options:
- Copy Cells
- Fill Series (for dates)
- Fill Formatting Only
- Fill Without Formatting

## 7.18 Drag and Drop Row Reordering

### Enable Row Dragging
```typescript
const columnDefs: ColDef[] = [
  {
    headerName: '',
    field: 'rowDrag',
    rowDrag: true,
    width: 30,
    suppressMenu: true,
    cellClass: 'cursor-grab'
  },
  // ... other columns
];

const gridOptions: GridOptions = {
  rowDragManaged: true,
  animateRows: true,
  onRowDragEnd: async (event) => {
    const { node, overNode } = event;
    
    // Calculate new order
    const newOrder = calculateNewOrder(node, overNode);
    
    // Save new order to backend
    await api.reorderRow(node.data.id, newOrder);
  }
};
```

### Visual Feedback During Drag
- Dragged row shows with shadow/elevation
- Drop target row highlighted with blue line
- Invalid drop targets shown with red indicator

## 7.19 Zoom Controls

### Zoom Levels
| Level | Display |
|-------|---------|
| 50% | Compact view |
| 75% | Small |
| 100% | Normal (default) |
| 125% | Large |
| 150% | Extra large |

### Zoom Controls
```typescript
const ZoomControls = () => {
  const [zoom, setZoom] = useLocalStorage('gridZoom', 100);
  
  return (
    <div className="zoom-controls">
      <button onClick={() => setZoom(Math.max(50, zoom - 25))}>−</button>
      <span>{zoom}%</span>
      <button onClick={() => setZoom(Math.min(150, zoom + 25))}>+</button>
    </div>
  );
};

// Apply zoom to grid
const gridStyle = {
  fontSize: `${zoom}%`,
  '--ag-row-height': `${Math.round(32 * zoom / 100)}px`,
};
```

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl + +` | Zoom in |
| `Ctrl + -` | Zoom out |
| `Ctrl + 0` | Reset to 100% |

## 7.20 Go To Dialog (Ctrl+G)

### Go To Row
```typescript
interface GoToDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGoTo: (rowNumber: number) => void;
}

const GoToDialog = ({ isOpen, onClose, onGoTo }: GoToDialogProps) => {
  const [rowNumber, setRowNumber] = useState('');
  
  const handleSubmit = () => {
    const row = parseInt(rowNumber, 10);
    if (row > 0 && row <= totalRows) {
      onGoTo(row - 1); // Convert to 0-indexed
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Go To Row</DialogTitle>
      <DialogContent>
        <input
          type="number"
          min="1"
          max={totalRows}
          value={rowNumber}
          onChange={e => setRowNumber(e.target.value)}
          placeholder={`1 - ${totalRows}`}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Go</Button>
      </DialogActions>
    </Dialog>
  );
};
```

### Go To Patient
- Search by patient name
- Jump to first row for that patient

## 7.21 Alternating Row Colors (Zebra Stripes)

### Row Styling
```typescript
const gridOptions: GridOptions = {
  getRowClass: (params) => {
    return params.rowIndex % 2 === 0 ? 'row-even' : 'row-odd';
  }
};

// CSS
.row-even {
  background-color: #FFFFFF;
}

.row-odd {
  background-color: #F9FAFB; /* Light gray */
}

// Note: Conditional formatting (color coding) takes priority over zebra stripes
```

### Toggle Option
- User preference to enable/disable zebra stripes
- Stored in local storage

## 7.22 Sticky Header

### Header Behavior
- Column headers remain visible when scrolling vertically
- Pinned columns remain visible when scrolling horizontally

```typescript
const gridOptions: GridOptions = {
  suppressColumnVirtualisation: false,
  suppressRowVirtualisation: false,
  // Headers are sticky by default in AG Grid
  headerHeight: 40,
  floatingFiltersHeight: 35,
};
```

## 7.23 Change History / Audit Trail

### View Change History
```typescript
interface ChangeHistoryEntry {
  id: number;
  rowId: number;
  field: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  changedAt: Date;
}

// Show history for a specific row
const RowHistoryDialog = ({ rowId }: { rowId: number }) => {
  const [history, setHistory] = useState<ChangeHistoryEntry[]>([]);
  
  useEffect(() => {
    api.getRowHistory(rowId).then(setHistory);
  }, [rowId]);
  
  return (
    <Dialog>
      <DialogTitle>Change History</DialogTitle>
      <DialogContent>
        <table>
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Field</th>
              <th>Old Value</th>
              <th>New Value</th>
              <th>Changed By</th>
            </tr>
          </thead>
          <tbody>
            {history.map(entry => (
              <tr key={entry.id}>
                <td>{formatDateTime(entry.changedAt)}</td>
                <td>{entry.field}</td>
                <td>{entry.oldValue}</td>
                <td>{entry.newValue}</td>
                <td>{entry.changedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
};
```

### Access History
- Right-click row → "View History"
- Shows last 50 changes for that row

## 7.24 Spell Check

### Enable Spell Check
```typescript
// Enable browser spell check for text fields
const textCellEditor: ColDef = {
  cellEditor: 'agTextCellEditor',
  cellEditorParams: {
    inputProps: {
      spellCheck: true,
    }
  }
};

// For notes field - multi-line with spell check
const notesCellEditor: ColDef = {
  cellEditor: 'agLargeTextCellEditor',
  cellEditorParams: {
    maxLength: 500,
    rows: 5,
    cols: 50,
  },
  cellEditorPopup: true,
};
```

### Spell Check Fields
| Field | Spell Check |
|-------|-------------|
| Member Name | Yes |
| Member Address | Yes |
| Notes | Yes |
| Tracking fields (text) | Yes |
| Dropdowns | No |
| Dates | No |

## 7.25 Print Support

### Print Options
```typescript
interface PrintOptions {
  columns: 'all' | 'visible';
  rows: 'all' | 'selected' | 'filtered';
  orientation: 'portrait' | 'landscape';
  includeHeader: boolean;
  includeFooter: boolean;
  fitToPage: boolean;
}
```

### Print Preview
```typescript
const handlePrint = () => {
  // Generate print-friendly HTML
  const printContent = generatePrintContent({
    columns: 'visible',
    rows: 'filtered',
    orientation: 'landscape',
  });
  
  // Open print dialog
  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.print();
};
```

### Export to PDF
```typescript
const handleExportPDF = async () => {
  const pdfContent = await api.exportPDF({
    columns: 'visible',
    rows: 'all',
    orientation: 'landscape',
  });
  
  downloadFile(pdfContent, 'patient-tracker.pdf', 'application/pdf');
};
```

## 7.26 Cell Comments/Notes

### Add Comment to Cell
```typescript
interface CellComment {
  rowId: number;
  field: string;
  comment: string;
  author: string;
  createdAt: Date;
}

// Visual indicator for cells with comments
const cellRenderer = (params: ICellRendererParams) => {
  const hasComment = cellComments.has(`${params.data.id}-${params.colDef.field}`);
  
  return (
    <div className="relative">
      {params.value}
      {hasComment && (
        <div className="absolute top-0 right-0 w-0 h-0 
          border-t-8 border-t-red-500 
          border-l-8 border-l-transparent" 
        />
      )}
    </div>
  );
};
```

### Comment Actions
- Right-click → "Add Comment"
- Right-click → "View Comment"
- Right-click → "Delete Comment"
- Comments visible in hover tooltip

## 7.27 Text Wrapping

### Enable Text Wrapping for Notes
```typescript
const columnDefs: ColDef[] = [
  {
    field: 'notes',
    headerName: 'Notes',
    wrapText: true,
    autoHeight: true,
    cellStyle: {
      whiteSpace: 'normal',
      lineHeight: '1.4',
    },
    minWidth: 200,
    maxWidth: 500,
  }
];
```

### Row Height Adjustment
- Rows auto-expand to fit wrapped content
- Maximum row height: 150px
- Overflow shows "..." with expand option

## 7.28 Duplicate Highlighting

### Visual Indicator for Duplicates
```typescript
const getRowStyle = (params: RowClassParams): RowStyle | undefined => {
  // Check if this is a duplicate entry
  if (params.data?.isDuplicate) {
    return {
      backgroundColor: '#FEF3C7', // Light yellow
      borderLeft: '4px solid #F59E0B', // Orange left border
    };
  }
  
  // Check for potential duplicate (same patient + measure)
  if (isPotentialDuplicate(params.data)) {
    return {
      backgroundColor: '#FEF9C3', // Very light yellow
    };
  }
  
  return undefined;
};
```

### Duplicate Detection
```typescript
const checkForDuplicates = (data: GridRow[]): Map<number, number[]> => {
  const duplicateMap = new Map<number, number[]>();
  
  // Group by patient + quality measure
  const groups = groupBy(data, row => 
    `${row.memberName}-${row.memberDob}-${row.qualityMeasure}`
  );
  
  // Mark groups with more than 1 entry
  Object.entries(groups).forEach(([key, rows]) => {
    if (rows.length > 1) {
      rows.forEach(row => {
        duplicateMap.set(row.id, rows.map(r => r.id));
      });
    }
  });
  
  return duplicateMap;
};
```

## 7.29 Address Auto-Formatting

### Address Normalization
```typescript
export function formatAddress(value: string): string {
  if (!value) return '';
  
  let formatted = value.trim();
  
  // Normalize common abbreviations
  const abbreviations: Record<string, string> = {
    'street': 'St',
    'avenue': 'Ave',
    'boulevard': 'Blvd',
    'drive': 'Dr',
    'lane': 'Ln',
    'road': 'Rd',
    'court': 'Ct',
    'circle': 'Cir',
    'apartment': 'Apt',
    'suite': 'Ste',
  };
  
  // Apply abbreviations (case insensitive)
  Object.entries(abbreviations).forEach(([full, abbr]) => {
    const regex = new RegExp(`\\b${full}\\b`, 'gi');
    formatted = formatted.replace(regex, abbr);
  });
  
  // Title case street names
  formatted = formatted.replace(/\b\w/g, char => char.toUpperCase());
  
  // Uppercase state abbreviations
  formatted = formatted.replace(/\b([A-Za-z]{2})\s+(\d{5}(-\d{4})?)\b/, 
    (_, state, zip) => `${state.toUpperCase()} ${zip}`
  );
  
  return formatted;
}
```

### Address Input Examples
| User Input | Formatted Output |
|------------|------------------|
| `123 main street` | `123 Main St` |
| `456 oak avenue apt 2` | `456 Oak Ave Apt 2` |
| `789 elm blvd, anytown ca 90210` | `789 Elm Blvd, Anytown CA 90210` |

## 7.30 Paste Special Options

### Paste Special Dialog (Ctrl+Shift+V)
```typescript
interface PasteSpecialOptions {
  pasteType: 'all' | 'values' | 'formatting';
  skipBlanks: boolean;
  transpose: boolean;
}

const PasteSpecialDialog = () => {
  const [options, setOptions] = useState<PasteSpecialOptions>({
    pasteType: 'all',
    skipBlanks: false,
    transpose: false,
  });
  
  return (
    <Dialog>
      <DialogTitle>Paste Special</DialogTitle>
      <DialogContent>
        <RadioGroup 
          value={options.pasteType}
          onChange={e => setOptions({...options, pasteType: e.target.value})}
        >
          <Radio value="all" label="All" />
          <Radio value="values" label="Values only" />
          <Radio value="formatting" label="Formatting only" />
        </RadioGroup>
        
        <Checkbox 
          checked={options.skipBlanks}
          onChange={e => setOptions({...options, skipBlanks: e.target.checked})}
          label="Skip blanks"
        />
        
        <Checkbox 
          checked={options.transpose}
          onChange={e => setOptions({...options, transpose: e.target.checked})}
          label="Transpose"
        />
      </DialogContent>
    </Dialog>
  );
};
```

## 7.31 Required Field Indicators

### Visual Indicator
```typescript
// Show asterisk in header for required columns
const columnDefs: ColDef[] = [
  {
    field: 'memberName',
    headerName: 'Member Name *',
    headerClass: 'required-field',
  },
  {
    field: 'memberDob',
    headerName: 'Member DOB *',
    headerClass: 'required-field',
  },
  {
    field: 'requestType',
    headerName: 'Request Type *',
    headerClass: 'required-field',
  },
  // ...
];

// CSS
.required-field {
  color: #1F2937;
}
.required-field::after {
  content: '';
  color: #EF4444;
}
```

### Empty Required Field Styling
```typescript
const getCellClass = (params: CellClassParams): string => {
  const isRequired = ['memberName', 'memberDob', 'requestType'].includes(params.colDef.field);
  const isEmpty = !params.value || params.value.trim() === '';
  
  if (isRequired && isEmpty) {
    return 'required-empty'; // Red dotted border
  }
  
  return '';
};
```

## 7.32 Data Validation Dropdown Indicators

### Show Dropdown Arrow
```typescript
// Visual indicator for cells with dropdown options
const cellRenderer = (params: ICellRendererParams) => {
  const hasDropdown = isDropdownColumn(params.colDef.field, params.data);
  
  return (
    <div className="flex items-center justify-between">
      <span>{params.value}</span>
      {hasDropdown && (
        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
      )}
    </div>
  );
};
```

## 7.33 Number Formatting

### Numeric Field Formatting
```typescript
// Format HgbA1c values
export function formatHgbA1c(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '';
  
  // Always show one decimal place
  return num.toFixed(1);
}

// Format Time Interval (days)
export function formatDays(value: number): string {
  if (!value) return '';
  
  return `${value} day${value !== 1 ? 's' : ''}`;
}
```

### Column Configuration
```typescript
{
  field: 'timeIntervalDays',
  headerName: 'Time Interval',
  valueFormatter: (params) => formatDays(params.value),
  cellClass: 'text-right',
}
```

## 7.34 Selection Summary in Status Bar

### Selection Calculations
```typescript
const SelectionSummary = () => {
  const selectedCells = useGridSelection();
  
  const summary = useMemo(() => {
    const numericValues = selectedCells
      .map(cell => parseFloat(cell.value))
      .filter(v => !isNaN(v));
    
    if (numericValues.length === 0) {
      return null;
    }
    
    return {
      count: numericValues.length,
      sum: numericValues.reduce((a, b) => a + b, 0),
      average: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
    };
  }, [selectedCells]);
  
  if (!summary) {
    return <span>Selected: {selectedCells.length}</span>;
  }
  
  return (
    <div className="flex gap-4">
      <span>Count: {summary.count}</span>
      <span>Sum: {summary.sum.toFixed(2)}</span>
      <span>Avg: {summary.average.toFixed(2)}</span>
      <span>Min: {summary.min}</span>
      <span>Max: {summary.max}</span>
    </div>
  );
};
```

## 7.35 Quick Filter Bar

### Filter All Columns
```typescript
const QuickFilterBar = () => {
  const [filterText, setFilterText] = useState('');
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value);
    gridApi.setQuickFilter(e.target.value);
  };
  
  return (
    <div className="quick-filter">
      <SearchIcon className="w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder="Quick filter... (searches all columns)"
        value={filterText}
        onChange={handleFilterChange}
        className="flex-1"
      />
      {filterText && (
        <button onClick={() => { setFilterText(''); gridApi.setQuickFilter(''); }}>
          <XIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
```

## 7.36 Column Quick Actions

### Column Header Context Menu
```
┌─────────────────────────┐
│ Sort Ascending          │
│ Sort Descending         │
│ Clear Sort              │
├─────────────────────────┤
│ Pin to Left             │
│ Pin to Right            │
│ Unpin                   │
├─────────────────────────┤
│ Auto-size this column   │
│ Auto-size all columns   │
├─────────────────────────┤
│ Hide Column             │
│ Show All Columns        │
├─────────────────────────┤
│ Filter by...            │
│ Clear Filter            │
└─────────────────────────┘
```

## 7.37 Data Validation on Entry

### Real-time Validation
```typescript
const validateOnEntry = (field: string, value: any, rowData: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  switch (field) {
    case 'memberDob':
      const dob = parseDate(value);
      if (!dob) {
        errors.push('Invalid date format');
      } else if (dob > new Date()) {
        errors.push('Date of birth cannot be in the future');
      } else if (dob < new Date('1900-01-01')) {
        errors.push('Date of birth seems too old');
      }
      break;
      
    case 'memberTelephone':
      const digits = value.replace(/\D/g, '');
      if (digits.length > 0 && digits.length !== 10 && digits.length !== 11) {
        errors.push('Phone number must be 10 digits');
      }
      break;
      
    case 'tracking1':
      // Validate HgbA1c value if applicable
      if (rowData.qualityMeasure === 'Diabetes Control') {
        const hgba1c = parseFloat(value);
        if (isNaN(hgba1c)) {
          errors.push('HgbA1c must be a number');
        } else if (hgba1c < 3 || hgba1c > 20) {
          warnings.push('HgbA1c value seems unusual (expected 3-20)');
        }
      }
      break;
      
    case 'statusDate':
      const statusDate = parseDate(value);
      if (statusDate && statusDate > new Date()) {
        // Only warn for future dates on non-scheduled statuses
        if (!rowData.measureStatus?.toLowerCase().includes('scheduled')) {
          warnings.push('Date is in the future');
        }
      }
      break;
  }
  
  return { 
    valid: errors.length === 0, 
    errors, 
    warnings 
  };
};
```

### Validation Feedback Timing
| Event | Validation Timing |
|-------|-------------------|
| On keystroke | Debounced (300ms) |
| On blur (exit cell) | Immediate |
| On paste | Before applying |
| On import | Before saving |

---

# 8. Configuration Data

## 8.1 Seed Data (prisma/seed.ts)

The seed file should populate all configuration tables. Here's a partial example:

```typescript
// Request Types
const requestTypes = [
  { code: 'AWV', label: 'AWV', autoQualityMeasure: 'Annual Wellness Visit', sortOrder: 1 },
  { code: 'Screening', label: 'Screening', autoQualityMeasure: null, sortOrder: 2 },
  { code: 'Quality', label: 'Quality', autoQualityMeasure: null, sortOrder: 3 },
  { code: 'Chronic DX', label: 'Chronic DX', autoQualityMeasure: 'Chronic Diagnosis Code', sortOrder: 4 },
];

// Quality Measures (mapped to request types)
const qualityMeasures = [
  // AWV
  { requestType: 'AWV', code: 'Annual Wellness Visit', label: 'Annual Wellness Visit', allowDuplicates: false },
  
  // Screening
  { requestType: 'Screening', code: 'Breast Cancer Screening', label: 'Breast Cancer Screening', allowDuplicates: false },
  { requestType: 'Screening', code: 'Colon Cancer Screening', label: 'Colon Cancer Screening', allowDuplicates: false },
  { requestType: 'Screening', code: 'Cervical Cancer Screening', label: 'Cervical Cancer Screening', allowDuplicates: false },
  
  // Quality
  { requestType: 'Quality', code: 'Diabetic Eye Exam', label: 'Diabetic Eye Exam', allowDuplicates: false },
  { requestType: 'Quality', code: 'GC/Chlamydia Screening', label: 'GC/Chlamydia Screening', allowDuplicates: false },
  { requestType: 'Quality', code: 'Diabetic Nephropathy', label: 'Diabetic Nephropathy', allowDuplicates: false },
  { requestType: 'Quality', code: 'Hypertension Management', label: 'Hypertension Management', allowDuplicates: false },
  { requestType: 'Quality', code: 'ACE/ARB in DM or CAD', label: 'ACE/ARB in DM or CAD', allowDuplicates: false },
  { requestType: 'Quality', code: 'Vaccination', label: 'Vaccination', allowDuplicates: true },
  { requestType: 'Quality', code: 'Diabetes Control', label: 'Diabetes Control', allowDuplicates: false },
  { requestType: 'Quality', code: 'Annual Serum K&Cr', label: 'Annual Serum K&Cr', allowDuplicates: false },
  
  // Chronic DX
  { requestType: 'Chronic DX', code: 'Chronic Diagnosis Code', label: 'Chronic Diagnosis Code', allowDuplicates: true },
];

// HgbA1c Goal Options
const hgba1cGoalOptions = [
  { code: 'less_than_7', label: 'Less than 7', threshold: 7.0, sortOrder: 1 },
  { code: 'less_than_8', label: 'Less than 8', threshold: 8.0, sortOrder: 2 },
  { code: 'less_than_9', label: 'Less than 9', threshold: 9.0, sortOrder: 3 },
];

// ... (rest of seed data)
```

---

# 9. Business Logic Implementation

## 9.1 Formatting Service (formatting.service.ts) - NEW

```typescript
export class FormattingService {
  
  /**
   * Format and validate a field value based on field type
   */
  formatField(
    field: string,
    value: any
  ): { formatted: any; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];
    let formatted = value;
    
    switch (field) {
      case 'memberTelephone':
        const phoneResult = this.formatPhoneNumber(value);
        formatted = phoneResult.formatted;
        if (phoneResult.wasReformatted) {
          warnings.push('Phone number was reformatted');
        }
        if (phoneResult.error) {
          errors.push(phoneResult.error);
        }
        break;
        
      case 'memberDob':
      case 'statusDate':
        const dateResult = this.formatDate(value, field);
        formatted = dateResult.formatted;
        if (dateResult.wasReformatted) {
          warnings.push('Date was reformatted');
        }
        if (dateResult.error) {
          errors.push(dateResult.error);
        }
        break;
        
      case 'memberName':
        formatted = this.formatName(value);
        break;
        
      case 'tracking1':
        // Check if this is an HgbA1c value (numeric)
        if (this.isNumericValue(value)) {
          const numResult = this.formatHgbA1cValue(value);
          formatted = numResult.formatted;
          if (numResult.error) {
            errors.push(numResult.error);
          }
        }
        break;
    }
    
    return { formatted, warnings, errors };
  }
  
  private formatPhoneNumber(value: string): {
    formatted: string;
    wasReformatted: boolean;
    error?: string;
  } {
    if (!value) return { formatted: '', wasReformatted: false };
    
    const original = value;
    const digits = value.replace(/\D/g, '');
    const normalized = digits.startsWith('1') && digits.length === 11 
      ? digits.slice(1) 
      : digits;
    
    if (normalized.length === 0) {
      return { formatted: '', wasReformatted: false };
    }
    
    if (normalized.length !== 10) {
      return {
        formatted: value,
        wasReformatted: false,
        error: 'Phone number must be 10 digits'
      };
    }
    
    const formatted = `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
    
    return {
      formatted,
      wasReformatted: formatted !== original
    };
  }
  
  private formatDate(value: string, field: string): {
    formatted: string | null;
    wasReformatted: boolean;
    error?: string;
  } {
    if (!value) return { formatted: null, wasReformatted: false };
    
    const parsed = parseDate(value);
    
    if (!parsed) {
      return {
        formatted: null,
        wasReformatted: false,
        error: 'Invalid date format'
      };
    }
    
    // Validate based on field type
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (field === 'memberDob' && parsed > today) {
      return {
        formatted: null,
        wasReformatted: false,
        error: 'Date of birth cannot be in the future'
      };
    }
    
    const formatted = parsed.toISOString().split('T')[0]; // YYYY-MM-DD for storage
    
    return {
      formatted,
      wasReformatted: true // Always reformat to ISO
    };
  }
  
  private formatName(value: string): string {
    if (!value) return '';
    
    // Trim whitespace
    let formatted = value.trim();
    
    // Normalize multiple spaces to single space
    formatted = formatted.replace(/\s+/g, ' ');
    
    return formatted;
  }
  
  private formatHgbA1cValue(value: string): {
    formatted: string;
    error?: string;
  } {
    const num = parseFloat(value);
    
    if (isNaN(num)) {
      return { formatted: value, error: 'HgbA1c must be a number' };
    }
    
    if (num < 3 || num > 20) {
      return { formatted: value, error: 'HgbA1c must be between 3 and 20' };
    }
    
    // Format to one decimal place
    return { formatted: num.toFixed(1) };
  }
  
  private isNumericValue(value: string): boolean {
    return /^\d*\.?\d+$/.test(value.trim());
  }
}
```

## 9.2 Calculation Service (calculation.service.ts)

```typescript
export class CalculationService {
  
  /**
   * Calculate due date based on status, date, and tracking values
   */
  calculateDueDate(
    measureStatus: string,
    statusDate: Date | null,
    tracking1: string | null,
    tracking2: string | null,
    configService: ConfigService
  ): { dueDate: Date | null; timeIntervalDays: number | null } {
    
    if (!statusDate) {
      return { dueDate: null, timeIntervalDays: null };
    }
    
    // Get base due days from status config
    const statusConfig = configService.getMeasureStatusByCode(measureStatus);
    let dueDays = statusConfig?.baseDueDays;
    
    // Check for tracking-specific due day rules
    if (tracking1) {
      const rule = configService.getDueDayRule(measureStatus, tracking1);
      if (rule) {
        dueDays = rule.dueDays;
      }
    }
    
    // Special case: "Screening discussed" with month selection
    if (measureStatus === 'Screening discussed' && tracking1) {
      const monthMatch = tracking1.match(/In (\d+) Month/);
      if (monthMatch) {
        const months = parseInt(monthMatch[1]);
        const dueDate = addMonths(statusDate, months);
        const timeIntervalDays = differenceInDays(dueDate, statusDate);
        return { dueDate, timeIntervalDays };
      }
    }
    
    // Special case: HgbAic with testing interval from Tracking#2
    if ((measureStatus === 'HgbA1c NOT at goal' || measureStatus === 'HgbA1c at goal') && tracking2) {
      const monthMatch = tracking2.match(/(\d+) [Mm]onth/);
      if (monthMatch) {
        const months = parseInt(monthMatch[1]);
        const dueDate = addMonths(statusDate, months);
        const timeIntervalDays = differenceInDays(dueDate, statusDate);
        return { dueDate, timeIntervalDays };
      }
    }
    
    // Standard calculation
    if (dueDays !== null && dueDays !== undefined) {
      const dueDate = addDays(statusDate, dueDays);
      return { dueDate, timeIntervalDays: dueDays };
    }
    
    return { dueDate: null, timeIntervalDays: null };
  }
  
  /**
   * Get date prompt for a measure status
   */
  getDatePrompt(measureStatus: string, tracking1: string | null, configService: ConfigService): string | null {
    // Special cases based on tracking value
    if (tracking1 === 'Patient deceased') return 'Date of Death';
    if (tracking1 === 'Patient in hospice') return 'Date Reported';
    
    const statusConfig = configService.getMeasureStatusByCode(measureStatus);
    return statusConfig?.datePrompt || null;
  }
}
```

## 9.3 HgbA1c Service (hgba1c.service.ts)

```typescript
/**
 * HgbA1c Goal Configuration Service
 */
export class HgbA1cService {
  
  static readonly GOAL_OPTIONS = {
    'Less than 7': 7.0,
    'Less than 8': 8.0,
    'Less than 9': 9.0,
  };
  
  static readonly RECENT_TEST_THRESHOLD_MONTHS = 3.5;
  
  /**
   * Determine the color for an HgbA1c row based on goal configuration
   */
  determineRowColor(data: {
    statusDate: Date | null;
    tracking1: string | null;
    hgba1cGoal: string | null;
    hgba1cGoalReachedYear: boolean;
    hgba1cDeclined: boolean;
  }): 'GREEN' | 'ORANGE' | 'RED' | 'GRAY' | null {
    
    const {
      statusDate,
      tracking1,
      hgba1cGoal,
      hgba1cGoalReachedYear,
      hgba1cDeclined
    } = data;
    
    // Priority 1: Patient has reached goal for the year (permanent GREEN)
    if (hgba1cGoalReachedYear) {
      return 'GREEN';
    }
    
    // Priority 2: Patient declined (permanent GRAY)
    if (hgba1cDeclined) {
      return 'GRAY';
    }
    
    // If no test date or HgbA1c value, cannot determine color
    if (!statusDate || !tracking1) {
      return null;
    }
    
    // Parse HgbA1c value
    const hgba1cValue = parseFloat(tracking1);
    if (isNaN(hgba1cValue)) {
      return null;
    }
    
    // Get goal threshold
    const goalThreshold = HgbA1cService.GOAL_OPTIONS[hgba1cGoal as keyof typeof HgbA1cService.GOAL_OPTIONS];
    if (!goalThreshold) {
      return null;
    }
    
    // Calculate months since last test
    const monthsSinceTest = this.calculateMonthsSinceDate(statusDate);
    
    // Apply color logic
    if (hgba1cValue < goalThreshold) {
      if (monthsSinceTest <= HgbA1cService.RECENT_TEST_THRESHOLD_MONTHS) {
        return 'GREEN';
      } else {
        return 'ORANGE';
      }
    } else {
      return 'RED';
    }
  }
  
  getColorHex(color: 'GREEN' | 'ORANGE' | 'RED' | 'GRAY' | null): string | null {
    switch (color) {
      case 'GREEN': return '#C8E6C9';
      case 'ORANGE': return '#FFE0B2';
      case 'RED': return '#FFCDD2';
      case 'GRAY': return '#E0E0E0';
      default: return null;
    }
  }
  
  private calculateMonthsSinceDate(date: Date): number {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays / 30.44;
  }
}
```

---

# 10. Real-time Features

(Same as previous version - Socket.io server and client implementation)

---

# 11. Admin Panel

(Same as previous version - Admin API routes and controller)

---

# 12. Docker Deployment & Data Preservation

This section covers Docker deployment configuration AND strategies to ensure existing data is never lost during software updates.

## 12.1 Data Persistence Architecture

### Key Principle: Separate Data from Application

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HOST MACHINE                                  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  C:\DockerData\patient-tracker\                              │   │
│  │  ├── postgres/          ← Database files (PERSISTENT)       │   │
│  │  ├── backups/           ← Backup files (PERSISTENT)         │   │
│  │  └── config/            ← Editor credentials (PERSISTENT)   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         ↑ Mounted as volumes                                        │
│  ┌──────┴──────────────────────────────────────────────────────┐   │
│  │                     DOCKER CONTAINERS                        │   │
│  │  ┌─────────┐  ┌─────────────┐  ┌─────────────────────────┐ │   │
│  │  │  nginx  │  │  app        │  │  db (PostgreSQL)        │ │   │
│  │  │         │  │ (Node.js)   │  │                         │ │   │
│  │  │ Can be  │  │ Can be      │  │ Data stored on HOST     │ │   │
│  │  │ rebuilt │  │ rebuilt     │  │ Survives container      │ │   │
│  │  │ anytime │  │ anytime     │  │ destruction             │ │   │
│  │  └─────────┘  └─────────────┘  └─────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Data Survives Updates

| Component | Stored Where | Survives Update? |
|-----------|--------------|------------------|
| Patient data | `postgres_data` volume on host | ✅ YES |
| Database schema | Inside PostgreSQL | ✅ YES (with migrations) |
| Editor credentials | `config/editors.json` on host | ✅ YES |
| Admin password | `config/admin.json` on host | ✅ YES |
| Backup files | `backups/` on host | ✅ YES |
| Application code | Inside container | ❌ Replaced (intentionally) |
| Static frontend | Inside container | ❌ Replaced (intentionally) |

## 12.2 docker-compose.yml (Production)

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - patient-tracker

  app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://appuser:${DB_PASSWORD}@db:5432/patienttracker
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    volumes:
      # Config files persist across updates
      - ./config:/app/config
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - patient-tracker

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=patienttracker
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      # CRITICAL: Database files stored on host, not in container
      - postgres_data:/var/lib/postgresql/data
      # Backup directory accessible from host
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d patienttracker"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - patient-tracker

networks:
  patient-tracker:
    driver: bridge

volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      # WINDOWS: Store database on host filesystem
      device: C:/DockerData/patient-tracker/postgres
      # LINUX: device: /var/lib/patient-tracker/postgres
```

## 12.3 Dockerfile (Multi-stage Build)

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy and build backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

COPY backend ./backend
RUN cd backend && npm run build

# Copy and build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend ./frontend
RUN cd frontend && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy backend build
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./
COPY --from=builder /app/backend/prisma ./prisma

# Copy frontend build
COPY --from=builder /app/frontend/dist ./public

# Create config directory (will be mounted as volume)
RUN mkdir -p /app/config

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

## 12.4 nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name _;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_cache_bypass $http_upgrade;
        }

        location /socket.io {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /api {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

## 12.5 Database Migrations (Schema Updates)

When updating the software with database schema changes, Prisma migrations ensure data is preserved.

### How Migrations Work

```
┌─────────────────────────────────────────────────────────────────────┐
│ Old Schema (v1)              →    New Schema (v2)                   │
│                                                                      │
│ patients                          patients                           │
│ ├── id                            ├── id                            │
│ ├── member_name                   ├── member_name                   │
│ ├── member_dob                    ├── member_dob                    │
│ └── member_telephone              ├── member_telephone              │
│                                   ├── member_email    ← NEW COLUMN  │
│                                   └── preferred_contact ← NEW COLUMN│
│                                                                      │
│ Migration SQL (auto-generated):                                      │
│   ALTER TABLE patients ADD COLUMN member_email VARCHAR(255);         │
│   ALTER TABLE patients ADD COLUMN preferred_contact VARCHAR(50);     │
│                                                                      │
│ EXISTING DATA IS PRESERVED - only structure changes                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Migration Files Structure

```
prisma/
├── schema.prisma              # Current schema definition
└── migrations/
    ├── 20250101000000_initial/
    │   └── migration.sql      # Initial schema creation
    ├── 20250115000000_add_hgba1c_goals/
    │   └── migration.sql      # Added HgbA1c goal fields
    ├── 20250120000000_add_email_field/
    │   └── migration.sql      # Added email column
    └── migration_lock.toml    # Prevents concurrent migrations
```

### Creating Migrations

```bash
# During development - create migration from schema changes
npx prisma migrate dev --name add_new_feature

# This generates:
# 1. SQL file in prisma/migrations/
# 2. Updates the database
# 3. Regenerates Prisma client
```

### Applying Migrations in Production

```bash
# In production - apply pending migrations (NON-DESTRUCTIVE)
npx prisma migrate deploy

# This:
# 1. Checks which migrations have been applied
# 2. Applies only NEW migrations
# 3. NEVER drops tables or deletes data
```

## 12.6 Safe Update Procedure

### Update Script (update.ps1)

```powershell
# update.ps1 - Safe update procedure for Windows
param(
    [switch]$SkipBackup = $false
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Patient Tracker - Safe Update Procedure" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Create pre-update backup
if (-not $SkipBackup) {
    Write-Host "`n[Step 1/6] Creating pre-update backup..." -ForegroundColor Yellow
    
    $backupFile = "pre_update_$timestamp.dump"
    docker exec patient-tracker-db-1 pg_dump -U appuser -d patienttracker -F c -f /backups/$backupFile
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Backup failed! Aborting update." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Backup created: backups/$backupFile" -ForegroundColor Green
} else {
    Write-Host "`n[Step 1/6] Skipping backup (not recommended!)" -ForegroundColor Yellow
}

# Step 2: Pull/copy new application files
Write-Host "`n[Step 2/6] Updating application files..." -ForegroundColor Yellow
# If using git:
# git pull origin main
# If using file copy:
# Copy-Item -Path "\\server\releases\latest\*" -Destination "." -Recurse -Force
Write-Host "Application files updated" -ForegroundColor Green

# Step 3: Stop the application (database keeps running)
Write-Host "`n[Step 3/6] Stopping application container..." -ForegroundColor Yellow
docker compose stop app nginx
Write-Host "Application stopped" -ForegroundColor Green

# Step 4: Rebuild application container
Write-Host "`n[Step 4/6] Rebuilding application..." -ForegroundColor Yellow
docker compose build app
Write-Host "Application rebuilt" -ForegroundColor Green

# Step 5: Run database migrations
Write-Host "`n[Step 5/6] Running database migrations..." -ForegroundColor Yellow
docker compose run --rm app npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Migration failed! Rolling back..." -ForegroundColor Red
    
    # Restore from backup
    docker exec patient-tracker-db-1 pg_restore -U appuser -d patienttracker -c /backups/$backupFile
    
    Write-Host "Rolled back to pre-update state" -ForegroundColor Yellow
    exit 1
}
Write-Host "Migrations applied successfully" -ForegroundColor Green

# Step 6: Start application
Write-Host "`n[Step 6/6] Starting application..." -ForegroundColor Yellow
docker compose up -d
Write-Host "Application started" -ForegroundColor Green

# Verify health
Write-Host "`nVerifying application health..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$health = Invoke-RestMethod -Uri "http://localhost/api/health" -Method Get -ErrorAction SilentlyContinue
if ($health.status -eq "ok") {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "UPDATE COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "Database: $($health.db)" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "`nWARNING: Health check failed. Please verify manually." -ForegroundColor Yellow
}
```

### Update Script (update.sh) - Linux

```bash
#!/bin/bash
# update.sh - Safe update procedure for Linux

set -e

TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
SKIP_BACKUP=false

echo "========================================"
echo "Patient Tracker - Safe Update Procedure"
echo "========================================"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-backup) SKIP_BACKUP=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Step 1: Create pre-update backup
if [ "$SKIP_BACKUP" = false ]; then
    echo -e "\n[Step 1/6] Creating pre-update backup..."
    BACKUP_FILE="pre_update_$TIMESTAMP.dump"
    docker exec patient-tracker-db-1 pg_dump -U appuser -d patienttracker -F c -f /backups/$BACKUP_FILE
    echo "Backup created: backups/$BACKUP_FILE"
else
    echo -e "\n[Step 1/6] Skipping backup (not recommended!)"
fi

# Step 2: Pull new files
echo -e "\n[Step 2/6] Updating application files..."
git pull origin main || true
echo "Application files updated"

# Step 3: Stop application
echo -e "\n[Step 3/6] Stopping application container..."
docker compose stop app nginx
echo "Application stopped"

# Step 4: Rebuild
echo -e "\n[Step 4/6] Rebuilding application..."
docker compose build app
echo "Application rebuilt"

# Step 5: Run migrations
echo -e "\n[Step 5/6] Running database migrations..."
if ! docker compose run --rm app npx prisma migrate deploy; then
    echo "ERROR: Migration failed! Rolling back..."
    docker exec patient-tracker-db-1 pg_restore -U appuser -d patienttracker -c /backups/$BACKUP_FILE
    echo "Rolled back to pre-update state"
    exit 1
fi
echo "Migrations applied successfully"

# Step 6: Start application
echo -e "\n[Step 6/6] Starting application..."
docker compose up -d
echo "Application started"

# Verify
echo -e "\nVerifying application health..."
sleep 5
curl -s http://localhost/api/health | grep -q '"status":"ok"' && \
    echo "UPDATE COMPLETED SUCCESSFULLY!" || \
    echo "WARNING: Health check failed. Please verify manually."
```

## 12.7 Backup Strategy

### Automated Daily Backups

```powershell
# backup.ps1 - Run via Windows Task Scheduler daily at 2 AM
$date = Get-Date -Format "yyyy-MM-dd"
$backupDir = "C:\DockerData\patient-tracker\backups"
$retentionDays = 30
$networkBackup = "\\fileserver\backups\patient-tracker"

# Create local backup
$backupFile = "daily_$date.dump"
docker exec patient-tracker-db-1 pg_dump -U appuser -d patienttracker -F c -f /backups/$backupFile

# Copy to network location
if (Test-Path $networkBackup) {
    Copy-Item "$backupDir\$backupFile" "$networkBackup\$backupFile"
    Write-Host "Backup copied to network: $networkBackup\$backupFile"
}

# Clean old local backups (keep 30 days)
Get-ChildItem "$backupDir\daily_*.dump" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$retentionDays) } | 
    Remove-Item

Write-Host "Backup completed: $backupFile"
```

### Backup Locations (3-2-1 Rule)

| Location | Path | Retention | Purpose |
|----------|------|-----------|---------|
| Local | `C:\DockerData\patient-tracker\backups\` | 30 days | Quick restore |
| Network | `\\fileserver\backups\patient-tracker\` | 90 days | Server failure recovery |
| Offsite | Cloud storage (optional) | 1 year | Disaster recovery |

### Manual Backup Before Major Changes

```powershell
# Create a named backup before major changes
$backupName = "before_major_update_v2"
docker exec patient-tracker-db-1 pg_dump -U appuser -d patienttracker -F c -f /backups/$backupName.dump
```

## 12.8 Restore Procedure

### Restore from Backup

```powershell
# restore.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

Write-Host "WARNING: This will REPLACE all current data with the backup!" -ForegroundColor Red
$confirm = Read-Host "Type 'RESTORE' to confirm"

if ($confirm -ne "RESTORE") {
    Write-Host "Restore cancelled."
    exit
}

# Stop application to prevent writes during restore
Write-Host "Stopping application..."
docker compose stop app

# Restore database
Write-Host "Restoring from backup: $BackupFile..."
docker exec patient-tracker-db-1 pg_restore -U appuser -d patienttracker -c /backups/$BackupFile

# Restart application
Write-Host "Starting application..."
docker compose start app

Write-Host "Restore completed successfully!" -ForegroundColor Green
```

## 12.9 Rollback Procedure

### If Update Fails

```powershell
# rollback.ps1 - Revert to previous version
param(
    [string]$BackupFile = "pre_update_*.dump"  # Most recent pre-update backup
)

# Find most recent pre-update backup
$latestBackup = Get-ChildItem "C:\DockerData\patient-tracker\backups\pre_update_*.dump" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1

if (-not $latestBackup) {
    Write-Host "ERROR: No pre-update backup found!" -ForegroundColor Red
    exit 1
}

Write-Host "Rolling back to: $($latestBackup.Name)"

# Stop everything
docker compose down

# Checkout previous version (if using git)
git checkout HEAD~1

# Rebuild with old version
docker compose build app

# Restore database
docker compose up -d db
Start-Sleep -Seconds 10
docker exec patient-tracker-db-1 pg_restore -U appuser -d patienttracker -c /backups/$($latestBackup.Name)

# Start application
docker compose up -d

Write-Host "Rollback completed!" -ForegroundColor Green
```

## 12.10 Version Tracking

### Database Version Table

```sql
-- Automatically managed by Prisma, but you can query it
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC;

-- Shows:
-- id                           | migration_name                  | finished_at
-- 20250120000000_add_email     | 20250120000000_add_email        | 2025-01-20 10:30:00
-- 20250115000000_add_hgba1c    | 20250115000000_add_hgba1c_goals | 2025-01-15 14:20:00
-- 20250101000000_initial       | 20250101000000_initial          | 2025-01-01 09:00:00
```

### Application Version

```typescript
// src/config/version.ts
export const APP_VERSION = {
  version: '2.2.0',
  buildDate: '2025-01-07',
  dbSchemaVersion: '20250120000000_add_email'
};

// Exposed via API
// GET /api/version
{
  "version": "2.2.0",
  "buildDate": "2025-01-07",
  "dbSchemaVersion": "20250120000000_add_email"
}
```

## 12.11 Disaster Recovery Scenarios

| Scenario | Recovery Steps | Data Loss | RTO |
|----------|---------------|-----------|-----|
| App container crash | Auto-restart by Docker | None | < 1 min |
| Server reboot | Docker auto-starts containers | None | < 5 min |
| Bad code deployment | Run rollback.ps1 | None | ~10 min |
| Failed migration | Auto-rollback from backup | None | ~10 min |
| Database corruption | Restore from daily backup | Up to 24 hrs | ~30 min |
| Server disk failure | New server + network backup | Up to 24 hrs | ~2 hours |
| Complete site disaster | New server + offsite backup | Up to 1 week | ~4 hours |

## 12.12 Data Preservation Checklist

### Before Any Update

- [ ] Verify backup system is working (check recent backup exists)
- [ ] Create manual pre-update backup
- [ ] Document current version number
- [ ] Review migration files for destructive operations
- [ ] Notify users of maintenance window

### During Update

- [ ] Run update.ps1 script (includes backup)
- [ ] Monitor migration output for errors
- [ ] If migration fails, verify auto-rollback worked

### After Update

- [ ] Verify application health endpoint
- [ ] Spot-check patient data is intact
- [ ] Verify row count matches pre-update
- [ ] Test critical workflows (add patient, update status)
- [ ] Keep pre-update backup for at least 7 days

### Monthly Verification

- [ ] Test restore procedure with copy of production data
- [ ] Verify network backups are accessible
- [ ] Review backup retention (clean old files if needed)
- [ ] Document any schema changes made

---

# 13. Testing Strategy

## 13.1 Test Categories

### Unit Tests
```
backend/src/__tests__/
├── services/
│   ├── calculation.service.test.ts
│   ├── validation.service.test.ts
│   ├── formatting.service.test.ts    # NEW
│   ├── measure.service.test.ts
│   └── hgba1c.service.test.ts
├── utils/
│   ├── helpers.test.ts
│   └── formatters.test.ts            # NEW
└── controllers/
    └── measures.controller.test.ts
```

## 13.2 Formatting Service Tests (NEW)

```typescript
// backend/src/__tests__/services/formatting.service.test.ts

import { FormattingService } from '../../services/formatting.service';

describe('FormattingService', () => {
  let formattingService: FormattingService;
  
  beforeEach(() => {
    formattingService = new FormattingService();
  });
  
  describe('formatField - memberTelephone', () => {
    
    it('should format 10 digits to (XXX) XXX-XXXX', () => {
      const result = formattingService.formatField('memberTelephone', '5551234567');
      expect(result.formatted).toBe('(555) 123-4567');
      expect(result.warnings).toContain('Phone number was reformatted');
      expect(result.errors).toHaveLength(0);
    });
    
    it('should handle dashes in input', () => {
      const result = formattingService.formatField('memberTelephone', '555-123-4567');
      expect(result.formatted).toBe('(555) 123-4567');
    });
    
    it('should handle dots in input', () => {
      const result = formattingService.formatField('memberTelephone', '555.123.4567');
      expect(result.formatted).toBe('(555) 123-4567');
    });
    
    it('should strip leading 1 (country code)', () => {
      const result = formattingService.formatField('memberTelephone', '15551234567');
      expect(result.formatted).toBe('(555) 123-4567');
    });
    
    it('should return error for invalid phone number', () => {
      const result = formattingService.formatField('memberTelephone', '555123');
      expect(result.errors).toContain('Phone number must be 10 digits');
    });
    
    it('should allow empty phone number', () => {
      const result = formattingService.formatField('memberTelephone', '');
      expect(result.formatted).toBe('');
      expect(result.errors).toHaveLength(0);
    });
    
  });
  
  describe('formatField - memberDob', () => {
    
    it('should parse MM/DD/YYYY format', () => {
      const result = formattingService.formatField('memberDob', '01/15/1960');
      expect(result.formatted).toBe('1960-01-15');
    });
    
    it('should parse M/D/YYYY format', () => {
      const result = formattingService.formatField('memberDob', '1/5/1960');
      expect(result.formatted).toBe('1960-01-05');
    });
    
    it('should parse MM-DD-YYYY format', () => {
      const result = formattingService.formatField('memberDob', '01-15-1960');
      expect(result.formatted).toBe('1960-01-15');
    });
    
    it('should handle 2-digit year (> 25 = 1900s)', () => {
      const result = formattingService.formatField('memberDob', '01/15/60');
      expect(result.formatted).toBe('1960-01-15');
    });
    
    it('should handle 2-digit year (<= 25 = 2000s)', () => {
      const result = formattingService.formatField('memberDob', '01/15/20');
      expect(result.formatted).toBe('2020-01-15');
    });
    
    it('should reject future dates for DOB', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const dateStr = `01/01/${futureDate.getFullYear()}`;
      
      const result = formattingService.formatField('memberDob', dateStr);
      expect(result.errors).toContain('Date of birth cannot be in the future');
    });
    
    it('should return error for invalid date format', () => {
      const result = formattingService.formatField('memberDob', 'not a date');
      expect(result.errors).toContain('Invalid date format');
    });
    
  });
  
  describe('formatField - memberName', () => {
    
    it('should trim whitespace', () => {
      const result = formattingService.formatField('memberName', '  John Doe  ');
      expect(result.formatted).toBe('John Doe');
    });
    
    it('should normalize multiple spaces', () => {
      const result = formattingService.formatField('memberName', 'John    Doe');
      expect(result.formatted).toBe('John Doe');
    });
    
  });
  
});
```

## 13.3 Manual Testing Checklist

### Grid Functionality
- [ ] Grid loads with all 14 columns
- [ ] Column sorting works (ascending/descending)
- [ ] Column filtering works
- [ ] Column resize works
- [ ] Column reorder works
- [ ] Scroll works smoothly with 1000+ rows

### Excel-like Behaviors
- [ ] **Auto-Save**: Data saves immediately when leaving a cell
- [ ] **Save Indicator**: Shows "Saving...", "✓ Saved", or error state
- [ ] **Phone Formatting**: Various input formats converted to (XXX) XXX-XXXX
- [ ] **Date Formatting**: Various input formats converted to MM/DD/YYYY display
- [ ] **Date Validation**: Future dates rejected for DOB, completed statuses
- [ ] **Address Formatting**: Auto-capitalizes and abbreviates street names
- [ ] **Keyboard Navigation**: Tab, Enter, Arrow keys work correctly
- [ ] **Copy/Paste**: Single cell and range copy/paste works
- [ ] **Paste Special**: Ctrl+Shift+V opens paste options dialog
- [ ] **Undo/Redo**: Ctrl+Z and Ctrl+Y work for recent changes
- [ ] **Context Menu**: Right-click shows appropriate options
- [ ] **Find/Replace**: Ctrl+F and Ctrl+H open dialogs
- [ ] **Go To**: Ctrl+G opens go to row dialog
- [ ] **Column Pinning**: First 5 columns stay fixed when scrolling
- [ ] **Unsaved Warning**: Browser warns before closing with pending changes
- [ ] **Fill Handle**: Drag cell corner to fill adjacent cells
- [ ] **Drag Row Reorder**: Can drag rows to reorder them
- [ ] **Zoom Controls**: Ctrl+/- to zoom in/out
- [ ] **Alternating Row Colors**: Zebra stripes visible (if enabled)
- [ ] **Sticky Header**: Headers stay visible when scrolling
- [ ] **Cell Comments**: Can add/view comments on cells
- [ ] **Text Wrapping**: Notes field wraps long text
- [ ] **Duplicate Highlighting**: Duplicate entries highlighted in yellow
- [ ] **Required Field Indicators**: Asterisks on required column headers
- [ ] **Dropdown Indicators**: Chevron shown for dropdown cells
- [ ] **Validation Visual Feedback**: Red border on invalid cells
- [ ] **Spell Check**: Browser spell check works on text fields
- [ ] **Quick Filter**: Search bar filters all columns
- [ ] **Selection Summary**: Status bar shows count/sum/avg of selection
- [ ] **Print Support**: Can print or export to PDF
- [ ] **Change History**: Can view row change history

### Dropdown Dependencies
- [ ] Request Type dropdown shows all 4 options
- [ ] Selecting AWV auto-fills Quality Measure
- [ ] Selecting Chronic DX auto-fills Quality Measure
- [ ] Quality Measure dropdown is filtered by Request Type
- [ ] Measure Status dropdown is filtered by Quality Measure
- [ ] Tracking fields update based on Measure Status

### Business Rules
- [ ] Duplicate detection works (same patient + measure)
- [ ] Vaccination allows multiple entries
- [ ] Chronic DX allows multiple entries
- [ ] Date prompt appears when status changes
- [ ] Due date calculates correctly
- [ ] Due date varies by tracking selection

### HgbA1c Goal Configuration
- [ ] HgbA1c Goal dropdown appears for Diabetes Control rows
- [ ] Goal options: Less than 7, Less than 8, Less than 9
- [ ] "Goal Reached for Year" checkbox works
- [ ] "Patient Declined" checkbox works
- [ ] Color logic works correctly (GREEN/ORANGE/RED/GRAY)

### Data Preservation & Updates
- [ ] **Docker volumes**: Database data stored on host filesystem
- [ ] **Backup creation**: Daily backup script runs successfully
- [ ] **Backup restore**: Can restore from backup file
- [ ] **Pre-update backup**: Update script creates backup before changes
- [ ] **Migration safety**: Schema migrations preserve existing data
- [ ] **Migration rollback**: Failed migration automatically restores backup
- [ ] **Version tracking**: Can query database schema version
- [ ] **Health endpoint**: /api/health shows database connection status
- [ ] **Update procedure**: Can update app without data loss
- [ ] **Rollback procedure**: Can revert to previous version
- [ ] **Network backup**: Backups copied to network location
- [ ] **Config persistence**: Editor credentials survive container rebuild

---

# 14. Implementation Phases

## Phase 1: Foundation (Week 1-2)
- [ ] Project setup (Docker, database, basic backend/frontend structure)
- [ ] Database schema and migrations
- [ ] Configuration data seed
- [ ] Basic CRUD API for patient measures
- [ ] Basic grid display (read-only)

## Phase 2: Core Features (Week 3-4)
- [ ] Dropdown dependencies (cascading selects)
- [ ] Business rule implementation (auto-fill, duplicate detection)
- [ ] Due date calculations
- [ ] Conditional formatting
- [ ] **Auto-formatting (phone, dates)** ← NEW
- [ ] HgbA1c Goal Configuration implementation

## Phase 3: Excel-like Behaviors (Week 5-6) ← EXPANDED
- [ ] Auto-save on cell edit with status indicator
- [ ] Keyboard navigation (Tab, Enter, Arrow keys)
- [ ] Copy/paste support (single cell and range)
- [ ] Paste Special options
- [ ] Undo/redo functionality
- [ ] Context menu (right-click)
- [ ] Find and replace
- [ ] Go To dialog
- [ ] Fill handle (drag to fill)
- [ ] Drag and drop row reordering
- [ ] Cell validation visual feedback
- [ ] Zoom controls
- [ ] Alternating row colors
- [ ] Change history view
- [ ] Spell check on text fields
- [ ] Print/PDF export
- [ ] Cell comments
- [ ] Text wrapping for notes
- [ ] Duplicate highlighting
- [ ] Required field indicators
- [ ] Quick filter bar
- [ ] Selection summary in status bar

## Phase 4: Collaboration (Week 6)
- [ ] Editor authentication
- [ ] Edit lock mechanism
- [ ] WebSocket real-time updates
- [ ] Lock status display

## Phase 5: Data Management (Week 7)
- [ ] CSV import
- [ ] CSV export
- [ ] Data validation

## Phase 6: Admin & Polish (Week 8)
- [ ] Admin panel
- [ ] Reference sheets
- [ ] Hide/show columns
- [ ] Audit logging
- [ ] Status bar
- [ ] Visual feedback refinements

## Phase 7: Testing & Deployment (Week 9-10)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Documentation
- [ ] **Docker deployment configuration**
- [ ] **Data persistence verification (volumes)**
- [ ] **Backup scripts (daily automated)**
- [ ] **Restore procedure testing**
- [ ] **Update scripts with pre-update backup**
- [ ] **Rollback procedure testing**
- [ ] **Migration safety verification**
- [ ] **Network backup configuration**
- [ ] **Version tracking implementation**
- [ ] **Health check endpoint**
- [ ] **Disaster recovery documentation**

---

# Appendix A: HgbA1c Goal Configuration Summary

(Same as previous version)

---

# Appendix B: Phone Number Format Reference

| Input Format | Example | Output |
|--------------|---------|--------|
| 10 digits | `5551234567` | `(555) 123-4567` |
| With dashes | `555-123-4567` | `(555) 123-4567` |
| With dots | `555.123.4567` | `(555) 123-4567` |
| With spaces | `555 123 4567` | `(555) 123-4567` |
| With country code | `1-555-123-4567` | `(555) 123-4567` |
| With +1 | `+1 555 123 4567` | `(555) 123-4567` |
| Already formatted | `(555) 123-4567` | `(555) 123-4567` |

---

# Appendix C: Date Format Reference

| Input Format | Example | Parsed As |
|--------------|---------|-----------|
| M/D/YYYY | `1/5/1960` | `01/05/1960` |
| MM/DD/YYYY | `01/05/1960` | `01/05/1960` |
| M-D-YYYY | `1-5-1960` | `01/05/1960` |
| MM-DD-YYYY | `01-05-1960` | `01/05/1960` |
| M.D.YYYY | `1.5.1960` | `01/05/1960` |
| M/D/YY (> 25) | `1/5/60` | `01/05/1960` |
| M/D/YY (<= 25) | `1/5/20` | `01/05/2020` |
| Month D, YYYY | `Jan 5, 1960` | `01/05/1960` |
| Full Month | `January 5, 1960` | `01/05/1960` |
| ISO | `1960-01-05` | `01/05/1960` |

---

# Appendix D: Keyboard Shortcuts Reference

## Navigation
| Shortcut | Action |
|----------|--------|
| `Tab` | Move to next cell |
| `Shift + Tab` | Move to previous cell |
| `Enter` | Confirm edit / Move down |
| `Shift + Enter` | Move up |
| `Arrow Keys` | Move in direction |
| `Home` | Go to first cell in row |
| `End` | Go to last cell in row |
| `Ctrl + Home` | Go to first cell (A1) |
| `Ctrl + End` | Go to last cell with data |
| `Page Up` | Scroll up one page |
| `Page Down` | Scroll down one page |
| `Ctrl + G` | Go to row dialog |

## Editing
| Shortcut | Action |
|----------|--------|
| `F2` | Enter edit mode |
| `Escape` | Cancel edit |
| `Delete` | Clear cell |
| `Backspace` | Clear cell and enter edit mode |

## Clipboard
| Shortcut | Action |
|----------|--------|
| `Ctrl + C` | Copy |
| `Ctrl + V` | Paste |
| `Ctrl + X` | Cut |
| `Ctrl + Shift + V` | Paste Special |

## Undo/Redo
| Shortcut | Action |
|----------|--------|
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + Shift + Z` | Redo (alternative) |

## Selection
| Shortcut | Action |
|----------|--------|
| `Ctrl + A` | Select all |
| `Shift + Arrow` | Extend selection |
| `Shift + Click` | Select range |
| `Ctrl + Click` | Multi-select |
| `Ctrl + Shift + End` | Select to last cell |

## Search
| Shortcut | Action |
|----------|--------|
| `Ctrl + F` | Find |
| `Ctrl + H` | Find & Replace |

## Row Operations
| Shortcut | Action |
|----------|--------|
| `Ctrl + D` | Duplicate row |
| `Ctrl + Shift + +` | Insert row above |
| `Ctrl + -` | Delete row |

## View
| Shortcut | Action |
|----------|--------|
| `Ctrl + +` | Zoom in |
| `Ctrl + -` | Zoom out |
| `Ctrl + 0` | Reset zoom to 100% |

---

# Quick Start for Claude Code

To implement this project with Claude Code, use these prompts in sequence:

```
1. "Create the project structure for a patient quality tracking app using Node.js/Express backend with Prisma ORM and React frontend with AG Grid. Set up Docker Compose with PostgreSQL."

2. "Implement the Prisma schema for patient tracking with configuration tables for cascading dropdowns. Include HgbA1c goal configuration fields."

3. "Create the seed file with all configuration data from the business requirements."

4. "Implement the backend API endpoints for CRUD operations with auto-save support, including auto-formatting for phone numbers and dates."

5. "Create the React frontend with AG Grid showing all 14 columns with cascading dropdown editors, conditional row styling, and phone/date formatters."

6. "Implement Excel-like behaviors: auto-save, keyboard navigation, copy/paste, undo/redo, and context menu."

7. "Add WebSocket support for real-time updates and implement the edit lock mechanism."

8. "Build the admin panel for managing editor accounts."

9. "Add CSV import/export functionality with format validation."

10. "Write unit tests for formatting, calculation, validation, and HgbA1c services."

11. "Create the Docker deployment configuration and backup scripts."
```

---

*End of Implementation Documentation (Final Version 2.1)*
