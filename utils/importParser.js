// utils/importParser.js — pure parser for the .txt data-import format.
//
// Implements the contract in /import-format.md:
//   [metadata lines]  # optional, must be FIRST, each `# key=value`
//   model<TAB>benchmark<TAB>lowestFitness   # required header
//   <data row>        # one row per (model x benchmark)
//
// Returns `{ ok: true, data }` or `{ ok: false, errors: [{ line, message }] }`
// and never throws for malformed input, so callers can surface line-numbered
// errors directly to the user.

// Canonical name -> backend ID maps. These mirror the canonical set in
// DE-dashboard-frontend/src/data/variantMappings.js (which in turn matches the
// backend IDs and de.cpp). The legacy short names in DE-forEC2/supplementaryCode/
// are intentionally NOT accepted.
const MUTATION_NAME_TO_ID = {
  "DE/rand/1": 1,
  "DE/rand/2": 2,
  "DE/rand/3": 3,
  "DE/best/1": 4,
  "DE/best/2": 5,
  "DE/best/3": 6,
  "DE/current-to-best/1": 7,
  "DE/current-to-best/2": 8,
  "DE/current-to-rand/1": 9,
  "DE/current-to-rand/2": 10,
};

const CROSSOVER_NAME_TO_ID = {
  exponential: 1,
  binomial: 2,
  onepoint: 3,
  twopoint: 4,
};

const SELECTION_NAME_TO_ID = {
  sts: 1,
  greedy: 2,
};

// Metadata keys, with the same ranges as the Simulation schema.
const METADATA_RULES = {
  np: { label: "np", int: true, min: 10, max: 40 },
  f: { label: "f", int: false, min: 0.1, max: 2.0 },
  cr: { label: "cr", int: false, min: 0.01, max: 1.0 },
  gen: { label: "gen", int: true, min: 1, max: Infinity },
  dim: { label: "dim", int: true, min: 1, max: 30 },
};

const HEADER_COLUMNS = ["model", "benchmark", "lowestfitness"];

const validateMetadata = (rule, key, value) => {
  const num = Number(value);
  if (value === "" || !Number.isFinite(num)) {
    return { error: `# ${key} must be a number, got '${value}'` };
  }
  if (rule.int && !Number.isInteger(num)) {
    return { error: `# ${key} must be an integer, got '${value}'` };
  }
  if (num < rule.min || num > rule.max) {
    const range = rule.max === Infinity ? `at least ${rule.min}` : `between ${rule.min} and ${rule.max}`;
    return { error: `# ${key} must be ${range}, got '${value}'` };
  }
  return { value: num };
};

// Split one line into trimmed tab-separated columns.
const splitColumns = (line) => line.split("\t").map((s) => s.trim());

// "<mutation>/<crossover>/<selection>" -> { mutationId, crossoverId, selectionId }.
// Parsed right-to-left so the slashes inside mutation names are unambiguous.
const parseModel = (modelStr) => {
  const parts = modelStr.split("/");
  if (parts.length < 3) {
    return {
      error: `Invalid model '${modelStr}' — expected <mutation>/<crossover>/<selection>`,
    };
  }

  const selection = parts[parts.length - 1];
  const crossover = parts[parts.length - 2];
  const mutation = parts.slice(0, -2).join("/");

  const selectionId = SELECTION_NAME_TO_ID[selection];
  if (selectionId == null) {
    return {
      error: `Invalid model '${modelStr}' — unknown selection '${selection}'. Valid values: sts, greedy.`,
    };
  }

  const crossoverId = CROSSOVER_NAME_TO_ID[crossover];
  if (crossoverId == null) {
    return {
      error: `Invalid model '${modelStr}' — unknown crossover '${crossover}'. Valid values: exponential, binomial, onepoint, twopoint.`,
    };
  }

  const mutationId = MUTATION_NAME_TO_ID[mutation];
  if (mutationId == null) {
    return {
      error: `Invalid model '${modelStr}' — unknown mutation '${mutation}'. Valid values: ${Object.keys(MUTATION_NAME_TO_ID).join(", ")}.`,
    };
  }

  return { mutationId, crossoverId, selectionId };
};

const parseImportFile = (content) => {
  const errors = [];
  const params = {};
  const rows = [];
  const seen = new Set();
  let headerFound = false;

  const normalized = String(content ?? "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed === "") continue;

    // Comment lines: parsed as metadata only BEFORE the header.
    if (trimmed.startsWith("#")) {
      if (!headerFound) {
        const body = trimmed.slice(1).trim();
        const eq = body.indexOf("=");
        if (eq !== -1) {
          const key = body.slice(0, eq).trim().toLowerCase();
          const value = body.slice(eq + 1).trim();
          if (Object.prototype.hasOwnProperty.call(METADATA_RULES, key)) {
            if (Object.prototype.hasOwnProperty.call(params, key)) {
              errors.push({ line: lineNo, message: `Duplicate metadata key '# ${key}'` });
            } else {
              const result = validateMetadata(METADATA_RULES[key], key, value);
              if (result.error) {
                errors.push({ line: lineNo, message: result.error });
              } else {
                params[key] = result.value;
              }
            }
          }
          // Unknown keys and lines without '=' are free comments (ignored).
        }
      }
      continue;
    }

    if (!headerFound) {
      // First non-comment line must be the header.
      const columns = splitColumns(raw);
      const isHeader =
        columns.length === HEADER_COLUMNS.length &&
        columns.every((c, idx) => c.toLowerCase() === HEADER_COLUMNS[idx]);
      if (!isHeader) {
        errors.push({
          line: lineNo,
          message: "Missing header — the first data line must be exactly: model<TAB>benchmark<TAB>lowestFitness",
        });
        return { ok: false, errors };
      }
      headerFound = true;
      continue;
    }

    // Data row.
    const columns = splitColumns(raw);
    if (columns.length !== 3) {
      errors.push({
        line: lineNo,
        message: `Expected 3 tab-separated columns, got ${columns.length}`,
      });
      continue;
    }

    const model = parseModel(columns[0]);
    if (model.error) {
      errors.push({ line: lineNo, message: model.error });
      continue;
    }

    const benchmark = Number(columns[1]);
    if (!Number.isInteger(benchmark) || benchmark < 1 || benchmark > 10) {
      errors.push({
        line: lineNo,
        message: `benchmark must be an integer between 1 and 10, got '${columns[1]}'`,
      });
      continue;
    }

    const fitnessValue = columns[2];
    if (fitnessValue === "") {
      errors.push({ line: lineNo, message: "lowestFitness is required" });
      continue;
    }
    const lowestFitness = Number(fitnessValue);
    if (!Number.isFinite(lowestFitness)) {
      errors.push({
        line: lineNo,
        message: `lowestFitness must be a finite number, got '${fitnessValue}'`,
      });
      continue;
    }

    const key = `${model.mutationId}/${model.crossoverId}/${model.selectionId}/${benchmark}`;
    if (seen.has(key)) {
      errors.push({
        line: lineNo,
        message: `Duplicate (model, benchmark) pair — '${columns[0]}' with benchmark ${benchmark} was already imported`,
      });
      continue;
    }
    seen.add(key);

    rows.push({
      functionId: benchmark,
      mutationId: model.mutationId,
      crossoverId: model.crossoverId,
      selectionId: model.selectionId,
      lowestFitness,
    });
  }

  if (!headerFound) {
    errors.push({ line: 1, message: "Missing header — file is empty or has no header line" });
    return { ok: false, errors };
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push({ line: 1, message: "No data rows found" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { params, simulationData: rows } };
};

module.exports = {
  parseImportFile,
  MUTATION_NAME_TO_ID,
  CROSSOVER_NAME_TO_ID,
  SELECTION_NAME_TO_ID,
};
