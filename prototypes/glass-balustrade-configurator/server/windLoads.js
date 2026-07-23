'use strict';

const { runSession } = require('./skycivClient');

const DIRECTIONS = ['0', '90', '180', '270'];

// Resolves an AS 1170.2 windward wall design pressure at the balustrade's elevation via
// load-gen-api's `standalone.loads.getLoads` (design_code "as1170"), via its own
// standalone.loads.start session (see the sessionFunction override below - NOT
// S3D.session.start, which breaks this call - see skycivClient.js's runSession comment).
//
// Per the plan's assumption #4: the design pressure is taken as the worst of the 4
// principal-direction windward wall pressures at the balustrade's elevation (a
// simplification vs. a full free-standing-barrier wind analysis), applied both outward
// and inward on the posts to cover pressure + suction.
//
// `min`/`max` in the API's response refer to the internal-pressure-coefficient bound
// (Kci min/max), NOT to which one is numerically larger - the governing magnitude for
// each direction is whichever of the two has the larger absolute combined pressure.
async function getWindPressure({ address, buildingHeightM, buildingLengthM, buildingWidthM, elevationM, importanceLevel, terrainCategory }) {
  if (!address) throw new Error('Site location (address) is required for the wind load lookup.');
  for (const [label, val] of Object.entries({ buildingHeightM, buildingLengthM, buildingWidthM, elevationM })) {
    if (!(val > 0)) throw new Error(`${label} must be a positive number`);
  }

  const functions = [
    {
      function: 'standalone.loads.getLoads',
      arguments: {
        project_details: { name: '', id: '', company: '', designer: '', client: '', notes: '', units: 'metric' },
        site_data: {
          design_code: 'as1170',
          project_address: address,
          site_image: false,
          sls_and_uls: {
            country: 'australia',
            design_working_life: '25_years',
            importance_level: String(importanceLevel),
          },
          topography: {
            wind_direction: 'E',
            terrain_category: terrainCategory,
            topo_image: false,
          },
        },
        building_data: {
          design_code: 'as1170',
          structure: 'building',
          // "flat" is not a valid roof_profile value (enum is gable/monoslope/hip/
          // pitched/troughed/open-monoslope per load-gen-api/SKILLS.md) - "monoslope"
          // with roof_angle: 0 below is the closest approximation. The roof shape
          // doesn't materially affect the windward wall pressure at the balustrade's
          // elevation (what this app actually uses), only roof suction, which is unused.
          roof_profile: 'monoslope',
          building_dimensions: {
            length: buildingLengthM,
            width: buildingWidthM,
            height: buildingHeightM,
            roof_angle: 0,
            mean_roof_height: buildingHeightM,
          },
          wind_parameters: {
            structure_type: 'building',
            elevated_building: false,
            wall_condition: '5',
            action_combination_case: '1',
            wall_type: 'impermeable',
            ratio_of_opening_to_total_area: '0',
            // floor_level takes a numeric-string level tag (or "roof") in the
            // documented working sample ("2", "3", "roof") - not an arbitrary label
            // like "balustrade", which the live API rejected.
            structure_level: [{ floor_level: '2', floor_elevation: elevationM }],
          },
          snow_parameters: false,
        },
        // Explicitly requested (this is also the default) so `reportLink` below is
        // always populated - the engineer should always be able to open and review
        // the underlying wind load report, same as the S3D model link and the AS/NZS
        // 1664 Quick Design PDF reports.
        report: true,
      },
    },
  ];

  // standalone.loads.getLoads requires standalone.loads.start as the session opener -
  // S3D.session.start (this client's default) was tried first and fails with a generic
  // "could not be completed for an unknown reason" error on the getLoads call itself,
  // confirmed against the live API. See the comment on runSession in skycivClient.js.
  const envelope = await runSession(functions, { sessionFunction: 'standalone.loads.start' });
  const result = envelope.functions[1]; // [0] = session.start, [1] = getLoads
  const data = result?.data;
  if (!data) throw new Error(result?.msg || 'Wind load lookup did not return data');

  const windwardByDirection = data.wind_pressure?.pressures?.windward_pressure || {};
  let pressurePa = 0;
  let governingDirection = null;
  for (const dir of DIRECTIONS) {
    const entry = windwardByDirection[dir]?.[0];
    if (!entry) continue;
    const magMin = Math.abs(entry.min?.combined ?? 0);
    const magMax = Math.abs(entry.max?.combined ?? 0);
    const mag = Math.max(magMin, magMax);
    if (mag > pressurePa) {
      pressurePa = mag;
      governingDirection = dir;
    }
  }

  return {
    pressurePa,
    governingDirection,
    windRegion: data.wind_data?.wind_region ?? null,
    windSpeed: data.wind_data?.wind_speed ?? null,
    terrainCategory,
    siteData: data.site_data ?? null,
    windData: data.wind_data ?? null,
    // Viewable AS 1170.2 wind load report - confirmed live at data.wind_pressure.report_link,
    // not documented under that exact path in load-gen-api/SKILLS.md's response examples.
    reportLink: data.wind_pressure?.report_link ?? null,
  };
}

module.exports = { getWindPressure };
