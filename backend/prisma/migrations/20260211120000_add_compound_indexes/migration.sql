-- Compound index for duplicate detection: covers lookups by patient + request type + quality measure
CREATE INDEX "patient_measures_patient_id_request_type_quality_measure_idx" ON "patient_measures"("patient_id", "request_type", "quality_measure");

-- Index for filter queries on request type
CREATE INDEX "patient_measures_request_type_idx" ON "patient_measures"("request_type");

-- Compound index for version check / audit log queries: covers lookups by entity + entityId + action + time ordering
CREATE INDEX "audit_log_entity_entity_id_action_created_at_idx" ON "audit_log"("entity", "entity_id", "action", "created_at");
