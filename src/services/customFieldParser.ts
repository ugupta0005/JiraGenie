/**
 * Parses custom Jira field values from the user's description text
 * and maps them to Jira custom field IDs with correct value formats.
 */

// Maps friendly field names (case-insensitive) → Jira field IDs and their value format
const FIELD_MAP: Array<{
  names: string[];           // possible name variations the user might type
  fieldId: string;           // Jira custom field ID
  format: 'select' | 'text' | 'number' | 'labels' | 'fixVersions';
}> = [
  { names: ['browser+os', 'browser os', 'browser and os', 'browser/os'], fieldId: 'customfield_17000', format: 'select' },
  { names: ['labels', 'label'],                                           fieldId: 'labels',             format: 'labels' },
  { names: ['severity'],                                                  fieldId: 'customfield_15000',  format: 'select' },
  { names: ['priority'],                                                  fieldId: 'priority',           format: 'select' },
  { names: ['sd - environment', 'sd environment', 'environment'],         fieldId: 'customfield_13606',  format: 'select' },
  { names: ['detected on', 'detected'],                                   fieldId: 'customfield_17475',  format: 'select' },
  { names: ['user role', 'userrole'],                                      fieldId: 'customfield_19302',  format: 'select' },
  { names: ['ux/ui scope required', 'ux ui scope', 'ux/ui scope'],        fieldId: 'customfield_17875',  format: 'select' },
  { names: ['story points', 'storypoints', 'story point'],               fieldId: 'customfield_10004',  format: 'number' },
  { names: ['fix versions', 'fixversions', 'fix version', 'fixversion'], fieldId: 'fixVersions',        format: 'fixVersions' },
];

export interface ParsedCustomFields {
  jiraFields: Record<string, unknown>;
  cleanDescription: string; // description with the field lines removed
}

/**
 * Parses the user's description text to extract custom Jira field values.
 *
 * Expected format in description:
 *   Browser+OS - Chrome+Windows
 *   Labels - TAB_Taxonomy_Create
 *   Severity - Medium
 *   Story Points - 1
 *   Fix versions - QA_TAB_2026_10.0
 *
 * Returns the Jira-formatted field values and the cleaned description.
 */
export function parseCustomFields(description: string): ParsedCustomFields {
  const lines = description.split('\n');
  const jiraFields: Record<string, unknown> = {};
  const cleanLines: string[] = [];
  const processedFieldIds = new Set<string>();

  // Marker line detection — skip lines like "Please fill all the mandatory fields..."
  const markerPatterns = [
    /please\s+fill\s+all/i,
    /mandatory\s+fields/i,
    /mentioned\s+below/i,
  ];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty or marker lines
    if (!trimmed) { cleanLines.push(line); continue; }
    if (markerPatterns.some(p => p.test(trimmed))) continue;

    // Try to match "FieldName - Value" or "FieldName: Value"
    const match = trimmed.match(/^(.+?)\s*[-:]\s+(.+)$/);
    if (!match) { cleanLines.push(line); continue; }

    const fieldName = match[1].trim().toLowerCase();
    const fieldValue = match[2].trim();

    // Find matching field definition
    const fieldDef = FIELD_MAP.find(f => f.names.some(n => n === fieldName));

    if (!fieldDef || processedFieldIds.has(fieldDef.fieldId)) {
      cleanLines.push(line);
      continue;
    }

    // Convert to Jira format based on field type
    switch (fieldDef.format) {
      case 'select':
        if (fieldDef.fieldId === 'priority') {
          jiraFields[fieldDef.fieldId] = { name: fieldValue };
        } else {
          jiraFields[fieldDef.fieldId] = { value: fieldValue };
        }
        break;

      case 'text':
        jiraFields[fieldDef.fieldId] = fieldValue;
        break;

      case 'number':
        jiraFields[fieldDef.fieldId] = parseFloat(fieldValue) || 0;
        break;

      case 'labels':
        // Labels can be comma-separated or a single value
        jiraFields[fieldDef.fieldId] = fieldValue.split(',').map(l => l.trim()).filter(Boolean);
        break;

      case 'fixVersions':
        // Fix versions can be comma-separated
        jiraFields[fieldDef.fieldId] = fieldValue.split(',').map(v => ({ name: v.trim() })).filter(v => v.name);
        break;
    }

    processedFieldIds.add(fieldDef.fieldId);
    console.log(`[CustomFields] Parsed: "${fieldDef.fieldId}" = ${JSON.stringify(jiraFields[fieldDef.fieldId])}`);
  }

  return {
    jiraFields,
    cleanDescription: cleanLines.join('\n').trim(),
  };
}
