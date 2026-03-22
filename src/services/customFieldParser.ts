/**
 * Parses custom Jira field values from the user's description text
 * and maps them to Jira custom field IDs with correct value formats.
 */

// Maps friendly field names (case-insensitive) → Jira field IDs and their value format
// "select" = single select { value: "..." }
// "multiselect" = multi-select [{ value: "..." }] — Jira rejects single object for these
const FIELD_MAP: Array<{
  names: string[];
  fieldId: string;
  format: 'select' | 'multiselect' | 'text' | 'number' | 'labels' | 'fixVersions';
}> = [
  { names: ['browser+os', 'browser os', 'browser and os', 'browser/os'],          fieldId: 'customfield_17000', format: 'multiselect' },
  { names: ['labels', 'label'],                                                    fieldId: 'labels',             format: 'labels' },
  { names: ['severity'],                                                           fieldId: 'customfield_15000',  format: 'select' },
  { names: ['priority'],                                                           fieldId: 'priority',           format: 'select' },
  { names: ['sd - environment', 'sd environment', 'sd-environment', 'environment'], fieldId: 'customfield_13606', format: 'multiselect' },
  { names: ['detected on', 'detected'],                                            fieldId: 'customfield_17475',  format: 'select' },
  { names: ['user role', 'userrole'],                                              fieldId: 'customfield_19302',  format: 'multiselect' },
  { names: ['ux/ui scope required', 'ux ui scope required', 'ux/ui scope'],        fieldId: 'customfield_17875',  format: 'multiselect' },
  { names: ['story points', 'storypoints', 'story point'],                        fieldId: 'customfield_10004',  format: 'number' },
  { names: ['fix versions', 'fixversions', 'fix version', 'fixversion'],           fieldId: 'fixVersions',        format: 'fixVersions' },
];

export interface ParsedCustomFields {
  jiraFields: Record<string, unknown>;
  cleanDescription: string;
}

/**
 * Parses the user's description text to extract custom Jira field values.
 *
 * Supported formats:
 *   Browser+OS - Chrome+Windows     (dash separator)
 *   Severity: Medium                (colon separator)
 *   SEVERITY  Medium                (spaces only — no separator)
 *   Labels - TAB_One, TAB_Two       (comma-separated for arrays)
 *
 * Returns the Jira-formatted field values and the cleaned description.
 */
export function parseCustomFields(description: string): ParsedCustomFields {
  const lines = description.split('\n');
  const jiraFields: Record<string, unknown> = {};
  const cleanLines: string[] = [];
  const processedFieldIds = new Set<string>();

  // Skip marker lines like "Please fill all mandatory fields..."
  const markerPatterns = [
    /please\s+fill\s+all/i,
    /mandatory\s+fields/i,
    /mentioned\s+below/i,
    /as\s+mentioned/i,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { cleanLines.push(line); continue; }
    if (markerPatterns.some(p => p.test(trimmed))) continue;

    // Try to match the line against known field names
    const parsed = tryParseLine(trimmed);
    if (parsed && !processedFieldIds.has(parsed.fieldDef.fieldId)) {
      const { fieldDef, value } = parsed;

      // Convert to Jira format based on field type
      switch (fieldDef.format) {
        case 'select':
          if (fieldDef.fieldId === 'priority') {
            jiraFields[fieldDef.fieldId] = { name: value };
          } else {
            jiraFields[fieldDef.fieldId] = { value };
          }
          break;

        case 'multiselect':
          // Multi-select fields require array format: [{ value: "..." }]
          jiraFields[fieldDef.fieldId] = value.split(',').map(v => ({ value: v.trim() })).filter(v => v.value);
          break;

        case 'text':
          jiraFields[fieldDef.fieldId] = value;
          break;

        case 'number':
          jiraFields[fieldDef.fieldId] = parseFloat(value) || 0;
          break;

        case 'labels':
          jiraFields[fieldDef.fieldId] = value.split(',').map(l => l.trim()).filter(Boolean);
          break;

        case 'fixVersions':
          jiraFields[fieldDef.fieldId] = value.split(',').map(v => ({ name: v.trim() })).filter(v => v.name);
          break;
      }

      processedFieldIds.add(fieldDef.fieldId);
      console.log(`[CustomFields] Parsed: "${fieldDef.fieldId}" = ${JSON.stringify(jiraFields[fieldDef.fieldId])}`);
    } else if (!parsed) {
      cleanLines.push(line);
    }
  }

  return {
    jiraFields,
    cleanDescription: cleanLines.join('\n').trim(),
  };
}

/**
 * Tries to match a trimmed line against known field names.
 * Supports three formats:
 *   1. "FieldName - Value"    (dash separator)
 *   2. "FieldName: Value"     (colon separator)
 *   3. "FieldName  Value"     (2+ spaces, no separator — e.g. "SEVERITY  Medium")
 *
 * For multi-word field names like "SD - Environment", we match against
 * all known name variations that could start the line.
 */
function tryParseLine(line: string): { fieldDef: typeof FIELD_MAP[0]; value: string } | null {
  const lineLower = line.toLowerCase();

  for (const fieldDef of FIELD_MAP) {
    for (const name of fieldDef.names) {
      // Check if the line starts with this field name (case-insensitive)
      if (!lineLower.startsWith(name)) continue;

      // Get the rest of the line after the field name
      const rest = line.substring(name.length).trim();

      // Try to extract the value from the rest
      let value = '';

      if (rest.startsWith('-')) {
        // "FieldName - Value" or "FieldName -Value"
        value = rest.substring(1).trim();
      } else if (rest.startsWith(':')) {
        // "FieldName: Value"
        value = rest.substring(1).trim();
      } else if (rest.length > 0 && /^[\s]/.test(rest)) {
        // "FieldName  Value" (space separation, the name already consumed)
        value = rest.trim();
      } else if (rest.length === 0) {
        // Just the field name with no value — skip
        continue;
      } else {
        // The "name" matched but there's no separator — might be a false match
        // e.g. "Detected Online" shouldn't match "Detected On"
        continue;
      }

      // Strip leading dash or colon from value if double-separated (e.g. "SD - Environment - QA")
      value = value.replace(/^[-:]\s*/, '');

      if (value) {
        return { fieldDef, value };
      }
    }
  }

  return null;
}
