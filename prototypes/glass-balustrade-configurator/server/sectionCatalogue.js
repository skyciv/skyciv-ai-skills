'use strict';

// Australian aluminium post sections, curated from section-selector/section_tree.json
// (grepped directly, not guessed) - real designations that exist verbatim under
// data["Australian"]["Aluminium"]["Rectangular tubes"|"Square tubes"|"Round tubes"],
// filtered to the 50-100mm outer-dimension range requested for posts. Dimensions
// (D/B/t) are parsed from each designation's own name (the tree stores names only, no
// inline geometry) using the observed AL<TYPE>-<dims>-<thickness> naming pattern.
//
// `category` is the third path element for section-selector's load_section array:
//   ["Australian", "Aluminium", <category>, "<name>"]
// `shape` matches the run-quick-design 2601-aluminium-design calculator's `shape` enum.
const POST_TYPES = {
  RHS: {
    label: 'RHS (Rectangular Hollow Section)',
    category: 'Rectangular tubes',
    shape: 'hollow rectangular',
    sections: [
      { name: 'ALRET-50-25-2', D: 50, B: 25, t: 2 },
      { name: 'ALRET-50-25-3', D: 50, B: 25, t: 3 },
      { name: 'ALRET-50-40-3', D: 50, B: 40, t: 3 },
      { name: 'ALRET-60-40-3', D: 60, B: 40, t: 3 },
      { name: 'ALRET-70-30-3', D: 70, B: 30, t: 3 },
      { name: 'ALRET-76-25-2.4', D: 76, B: 25, t: 2.4 },
      { name: 'ALRET-80-40-3', D: 80, B: 40, t: 3 },
      { name: 'ALRET-80-50-3', D: 80, B: 50, t: 3 },
      { name: 'ALRET-100-50-3', D: 100, B: 50, t: 3 },
      { name: 'ALRET-100-50-6', D: 100, B: 50, t: 6 },
    ],
  },
  SHS: {
    label: 'SHS (Square Hollow Section)',
    category: 'Square tubes',
    shape: 'hollow rectangular',
    sections: [
      { name: 'ALSQT-50-1', D: 50, B: 50, t: 1 },
      { name: 'ALSQT-50-1.6', D: 50, B: 50, t: 1.6 },
      { name: 'ALSQT-50-2', D: 50, B: 50, t: 2 },
      { name: 'ALSQT-50-2.5', D: 50, B: 50, t: 2.5 },
      { name: 'ALSQT-50-3', D: 50, B: 50, t: 3 },
      { name: 'ALSQT-50.0-5.0', D: 50, B: 50, t: 5 },
      { name: 'ALSQT-50.8-2.03', D: 50.8, B: 50.8, t: 2.03 },
      { name: 'ALSQT-50.8-3.18', D: 50.8, B: 50.8, t: 3.18 },
      { name: 'ALSQT-65.0-3.0', D: 65, B: 65, t: 3 },
      { name: 'ALSQT-76.2-6.35', D: 76.2, B: 76.2, t: 6.35 },
      { name: 'ALSQT-80-2.5', D: 80, B: 80, t: 2.5 },
      { name: 'ALSQT-100.00-3.00', D: 100, B: 100, t: 3 },
      { name: 'ALSQT-100-6', D: 100, B: 100, t: 6 },
    ],
  },
  CHS: {
    label: 'CHS (Circular Hollow Section)',
    category: 'Round tubes',
    shape: 'tube',
    sections: [
      { name: 'ALRT-50-2', D: 50, B: 50, t: 2 },
      { name: 'ALRT-50-3', D: 50, B: 50, t: 3 },
      { name: 'ALRT-50-4', D: 50, B: 50, t: 4 },
      { name: 'ALRT-50-5', D: 50, B: 50, t: 5 },
      { name: 'ALRT-50-6', D: 50, B: 50, t: 6 },
      { name: 'ALRT-60-2', D: 60, B: 60, t: 2 },
      { name: 'ALRT-60-3', D: 60, B: 60, t: 3 },
      { name: 'ALRT-60-5', D: 60, B: 60, t: 5 },
      { name: 'ALRT-63.5-6.35', D: 63.5, B: 63.5, t: 6.35 },
      { name: 'ALRT-76-1.6', D: 76, B: 76, t: 1.6 },
      { name: 'ALRT-76.2-4.75', D: 76.2, B: 76.2, t: 4.75 },
      { name: 'ALRT-76.2-6.35', D: 76.2, B: 76.2, t: 6.35 },
      { name: 'ALRT-80-3', D: 80, B: 80, t: 3 },
      { name: 'ALRT-88.9-5.35', D: 88.9, B: 88.9, t: 5.35 },
      { name: 'ALRT-100-3', D: 100, B: 100, t: 3 },
      { name: 'ALRT-100-6', D: 100, B: 100, t: 6 },
    ],
  },
};

// Fixed handrail section (CHS) - not one of the user-facing post-type/size dropdowns,
// since only post type/size were requested as inputs; shown read-only in the UI.
const HANDRAIL_SECTION = {
  postType: 'CHS',
  name: 'ALRT-50-3',
  D: 50,
  B: 50,
  t: 3,
  category: 'Round tubes',
  shape: 'tube',
};

// Structural extrusion alloy/temper for balustrade posts and handrails. The live
// 2601-aluminium-design calculator only has data for specific (alloy, temper) pairs -
// its static schema.json's alloy/temper enum (just "1100"/"H12") is a stub, not the
// full list. Verified directly against the live API: 6063/T5 (originally used here,
// a common architectural/window-framing alloy) is NOT a valid pair - it fails every
// call with "Cannot read properties of undefined (reading 'length')" regardless of
// `product`/`welded`. 6061/T6 (the standard structural aluminium alloy, and arguably
// more appropriate for load-bearing posts anyway) IS valid and returns real results -
// confirmed with a live batch call. 5052/H32 also confirmed valid if a different
// temper is ever needed. If you change this, verify the new pair against the live API
// first (a call with unsupported values crashes with that same generic error, not a
// clear "invalid alloy" message).
const ALLOY = 6061;
const TEMPER = 'T6';
const CUSTOM_MATERIAL_FALLBACK = {
  custom_alloy_name: 'Aluminium 6061-T6 (approximate, verify vs AS/NZS 1664.1)',
  temper_designation: 'T6',
  Ftu: '260',
  Fty: '240',
  Fcy: '240',
  Fsu: '170',
  Fsy: '140',
  Fbu: '260',
  Fby: '240',
  E: '70000',
  kt: '1',
  kc: '1',
};

// General-purpose extruded-aluminium FE material for the S3D model (linear-elastic
// stiffness + self-weight only) - the actual strength check is the AS/NZS 1664 Quick
// Design calculator, which applies its own alloy/temper allowable stresses.
const FE_MATERIAL = {
  name: 'Aluminium 6061-T6 (indicative FE properties)',
  density: 2700, // kg/m3
  elasticity_modulus: 70000, // MPa
  poissons_ratio: 0.33,
  class: 'aluminium',
};

function findSection(postType, sectionName) {
  const type = POST_TYPES[postType];
  if (!type) throw new Error(`Unknown post type "${postType}", expected one of ${Object.keys(POST_TYPES).join(', ')}`);
  const section = type.sections.find((s) => s.name === sectionName);
  if (!section) throw new Error(`Unknown section "${sectionName}" for post type "${postType}"`);
  return { ...section, category: type.category, shape: type.shape };
}

module.exports = {
  POST_TYPES,
  HANDRAIL_SECTION,
  ALLOY,
  TEMPER,
  CUSTOM_MATERIAL_FALLBACK,
  FE_MATERIAL,
  findSection,
};
