'use strict';

// Indicative AS 1170.1 Table 3.3-style minimum design actions on balustrades/barriers,
// keyed by the occupancy classification of the area being protected (per AS 1170.1
// Table 3.1's classification letters). These figures are NOT pulled from a SkyCiv skill
// or a live calculator - no barrier/balustrade load table exists in run-quick-design or
// load-combinations (confirmed by grep across both skills) - they are this app's own
// best-available indicative defaults, escalating from domestic/office occupancies up to
// crowd-loaded assembly areas.
//
// IMPORTANT: verify against the current AS 1170.1 edition/amendment for the applicable
// classification before relying on these for a real design. Both values are fully
// editable in the UI once a classification is selected - they are defaults, not
// hard-coded facts, precisely so an engineer can correct them per-project.
//
// Applied non-concurrently (per AS 1170.1 §3.6): the horizontal line load runs along
// the full handrail (load_group Qcb_line) OR the point load acts at the most severe
// single location, taken here as every post top (load_group Qcb_point) - the model
// includes both as separate load cases/combos and the design check envelopes the worse
// of the two automatically.
const BALUSTRADE_LOAD_TABLE = {
  A: { label: 'A - Domestic / residential', lineLoadKn: 0.3, pointLoadKn: 0.3 },
  B: { label: 'B - Offices', lineLoadKn: 0.5, pointLoadKn: 0.5 },
  C1: { label: 'C1 - Public assembly, fixed seating', lineLoadKn: 1.5, pointLoadKn: 1.5 },
  C2: { label: 'C2 - Public assembly, no fixed seating', lineLoadKn: 1.5, pointLoadKn: 1.5 },
  C3: { label: 'C3 - Areas without obstacles for moving people', lineLoadKn: 1.5, pointLoadKn: 1.5 },
  C4: { label: 'C4 - Areas with possible physical activities', lineLoadKn: 1.5, pointLoadKn: 1.5 },
  C5: { label: 'C5 - Areas susceptible to overcrowding', lineLoadKn: 3.0, pointLoadKn: 3.0 },
};

const CLASSIFICATIONS = Object.keys(BALUSTRADE_LOAD_TABLE);

function getBalustradeLoad(classification) {
  const entry = BALUSTRADE_LOAD_TABLE[classification];
  if (!entry) {
    throw new Error(`Unknown occupancy classification "${classification}", expected one of ${CLASSIFICATIONS.join(', ')}`);
  }
  return entry;
}

module.exports = { BALUSTRADE_LOAD_TABLE, CLASSIFICATIONS, getBalustradeLoad };
