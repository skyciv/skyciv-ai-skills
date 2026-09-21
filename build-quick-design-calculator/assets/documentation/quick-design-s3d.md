---
id: quick-design-s3d
title: S3D Integration
noIndex: true
---

You can automatically integrate your calculation pack with S3D, by writing a `s3d_integration.js` file. The purpose of this file is to extract data out of your model and analysis results, to run your calculations off. If your calc pack has a `s3d_integration.js` file and your `calculate.js` follows the standardised format, your solution will appear in the list in S3D:

<center><img src="/api/v3/img/qd/qd-s3d-menu.png"/></center>

From here, your model will be auto-integrated with the following UI:

<center><img src="/api/v3/img/qd/qd-s3d-ui.png"/></center>

## Layout

:::important
This file uses the UI format for S3D! So for instance, use `s3d_model.elements` not `s3d_model.members`!
:::

Use this file to compile an array of inputs for your calculator, that can be then run in batches:
```js
module.exports = function(s3d_model, analysis_results) { 

    //you will be given the model and analysis results to work from
    if (!analysis_results)  throw new Error("No Analysis Results. Please solve model first."); //if this is required, you can throw an error like this

    // Perform Logic, like looping through members in your s3d_model and building your input JSONs
   
    //return a list of inputs, these will get looped through the calculate.js file
    return [
        {a:100, b:200},
        {a:50, b:80},
        {a:60, b:150},
        {a:22, b:30.33}
    ]

}
```


## Helper Functions

### `StructureHelpers.getDesignForces()`

Returns an array of design forces for each member. It will scan all load combos and determine the worst result for each member in both + and - directions.

```js
StructureHelpers.getDesignForces(analysis_results);
```
Output:
```js
[
	null, //element 0
	{
		Mx: {
			abs: 0,
			pos: 0,
			neg: 0,
			governing_lc_abs: '#0 ULS: Case 1: 1.4D',
			governing_lc_pos: '#0 ULS: Case 1: 1.4D',
			governing_lc_neg: '#0 ULS: Case 1: 1.4D',
			governing_results_arr: // Same as Mz
			load_combos: // Same as Mz
		},
		My: {
			abs: 0,
			pos: 0,
			neg: 0,
			governing_lc_abs: '#0 ULS: Case 1: 1.4D',
			governing_lc_pos: '#0 ULS: Case 1: 1.4D',
			governing_lc_neg: '#0 ULS: Case 1: 1.4D',
			governing_results_arr: // Same as Mz
			load_combos: // Same as Mz
		},
		Mz: {
			abs: 5.6,
			pos: 5.6,
			neg: -5.6,
			governing_lc_abs: '#0 ULS: Case 1: 1.4D',
			governing_lc_pos: '#21 Envelope Absolute Max',
			governing_lc_neg: '#0 ULS: Case 1: 1.4D',
			governing_results_arr: [
				-5.6, -5.34545455, -5.09090909,
				-4.83636364, -4.58181818, -4.32727273,
				-4.07272727, -3.81818182, -3.56363636,
				-3.30909091, -3.05454545, -2.8,
				-2.54545455, -2.29090909, -2.03636364,
				-1.78181818, -1.52727273, -1.27272727,
				-1.01818182, -0.76363636, -0.50909091,
				-0.25454545, 0
			],
			load_combos: {
				'#0 ULS: Case 1: 1.4D': { abs: 5.6, pos: 0, neg: -5.6 },
				'#1 ULS: Cases 2a: (1.25 or 0.9)D + 1.5L': { abs: 5, pos: 0, neg: -5 },
				'#2 ULS: Cases 2b: (1.25 or 0.9)D + 1.5L + 0.5S': { abs: 5, pos: 0, neg: -5 },
				'#3 ULS: Cases 2c: (1.25 or 0.9)D + 1.5L + 0.4W': { abs: 5, pos: 0, neg: -5 },
				'#4 ULS: Cases 3a: (1.25 or 0.9)D + 1.5S': { abs: 5, pos: 0, neg: -5 },
				'#5 ULS: Cases 3b: (1.25 or 0.9)D + 1.5S + 0.5L': { abs: 5, pos: 0, neg: -5 },
				'#6 ULS: Cases 3c: (1.25 or 0.9)D + 1.5S + 0.4W': { abs: 5, pos: 0, neg: -5 },
				'#7 ULS: Cases 4a: (1.25 or 0.9)D + 1.4W': { abs: 5, pos: 0, neg: -5 },
				'#8 ULS: Cases 4b: (1.25 or 0.9)D + 1.4W + 0.5L': { abs: 5, pos: 0, neg: -5 },
				'#9 ULS: Cases 4c: (1.25 or 0.9)D + 1.4W + 0.5S': { abs: 5, pos: 0, neg: -5 },
				'#10 ULS: Case 5a: D + E': { abs: 4, pos: 0, neg: -4 },
				'#11 ULS: Case 5b: D + E + 0.5L + 0.25S': { abs: 4, pos: 0, neg: -4 },
				'#12 Dead: unfavorable': { abs: 4, pos: 0, neg: -4 },
				'#14 Live: live': { abs: 0, pos: 0, neg: 0 },
				'#15 Wind: wind': { abs: 0, pos: 0, neg: 0 },
				'#16 Snow: snow': { abs: 0, pos: 0, neg: 0 },
				'#17 Seis: Earthquake/Accidental': { abs: 0, pos: 0, neg: 0 },
				'#18 DL': { abs: 4, pos: 0, neg: -4 },
				'#19 Envelope Min': { abs: 5.6, pos: 0, neg: -5.6 },
				'#20 Envelope Max': { abs: 4, pos: 0, neg: -4 },
				'#21 Envelope Absolute Max': { abs: 5.6, pos: 5.6, neg: 0 }
			}
		},
		Vx: {
			abs: 0,
			pos: 0,
			neg: 0,
			governing_lc_abs: '#0 ULS: Case 1: 1.4D',
			governing_lc_pos: '#0 ULS: Case 1: 1.4D',
			governing_lc_neg: '#0 ULS: Case 1: 1.4D',
			governing_results_arr: // Same as Mz
			load_combos: // Same as Mz
		},
		Vy: {
			abs: 1.4,
			pos: 1.4,
			neg: 0,
			governing_lc_abs: '#0 ULS: Case 1: 1.4D',
			governing_lc_pos: '#0 ULS: Case 1: 1.4D',
			governing_lc_neg: '',
			governing_results_arr: // Same as Mz
			load_combos: // Same as Mz
		},
		Vz: {
			abs: 0,
			pos: 0,
			neg: 0,
			governing_lc_abs: '#0 ULS: Case 1: 1.4D',
			governing_lc_pos: '#0 ULS: Case 1: 1.4D',
			governing_lc_neg: '#0 ULS: Case 1: 1.4D',
			governing_results_arr: // Same as Mz
			load_combos: // Same as Mz
		},
		dx: {
			abs: 0,
			pos: 0,
			neg: 0,
			governing_lc_abs: '#0 ULS: Case 1: 1.4D',
			governing_lc_pos: '#0 ULS: Case 1: 1.4D',
			governing_lc_neg: '#0 ULS: Case 1: 1.4D',
			governing_results_arr: // Same as Mz
			load_combos: // Same as Mz
		},
		dy: {
			abs: 5.47462005,
			pos: 5.47462005,
			neg: -5.47462005,
			governing_lc_abs: '#0 ULS: Case 1: 1.4D',
			governing_lc_pos: '#21 Envelope Absolute Max',
			governing_lc_neg: '#0 ULS: Case 1: 1.4D',
			governing_results_arr: // Same as Mz
			load_combos: // Same as Mz
		},
		dz: {
			abs: 0,
			pos: 0,
			neg: 0,
			governing_lc_abs: '#0 ULS: Case 1: 1.4D',
			governing_lc_pos: '#0 ULS: Case 1: 1.4D',
			governing_lc_neg: '#0 ULS: Case 1: 1.4D',
			governing_results_arr: // Same as Mz
			load_combos: // Same as Mz
		},
		M_end: 5.6,
		V_end: 1.4
	}
];
```

:::tip
For members that are rigid links, `getDesignForces` will return no design forces.
:::

### `StructureHelpers.getMemberLength()`

Returns the member's length, including if offsets are used

```js
StructureHelpers.getMemberLength(s3d_model, elem_id, consider_offsets)
```

### `StructureHelpers.ezDesignForces()`

The ezDesignForces helper is an alternative to `StructureHelpers.getDesignForces()`. This method transforms and returns a simplified analysis object that is simpler to use in quick design. Only actions in action_list are retrieved. For shorter run-time when sections are not transformed in section builder and when loading inside of the individual load combinations is not of interest, use the express method. For all other cases, use the detailed method.

**Express method** : Use `include_lc = false`. Individual values at each element station are not retrieved and only maximum and minimum values are retrieved from each load combination. This only works when no transformations exist in sections, because transformations must be addressed at the individual load stations. An error will be thrown if one of the sections has a transformation applied (`rotation`, `mirror_y` or `mirror_z`) in section builder.

**Detailed method**: Use `include_lc = true`. Results at each station are retrieved for each member and for each load combination. Output loads are applied in line with geometric axis of members as they appear in section builder with no transformations (rotations or mirrors). Usually, this means the strong flexural axis is about the horizontal axis Z and the weak flexural axis is about the vertical axis Y.

#### Parameters

| **Key**            | **Type**  | **Accepts**                | **Description**           |
|--------------------|-----------|----------------------------|---------------------------|
| `s3d_analysis`     | `object`  | `S3D.results.getAll(true)` | Global S3D analysis object|
| `s3d_model`        | `object`  | `S3D.model_data`           | Global S3D model object   |
| `action_list`      | `array`   | An array of actions to retrieve from the analysis_result object, includes: `["axial", "bmd_y", "bmd_z", "sfd_y", "sfd_z", "torsion"]`   | Multiple actions possible, see `S3D.results.getAll(true)[0]` for the full list. If no value is given, the list following list of internal forces will be used: `action_list = ["axial", "bmd_y", "bmd_z", "sfd_y", "sfd_z", "torsion"]` |
| `include_lc`       | `boolean` | `true`, `false`            | If `true`, includes individual load combinations and section transformations. If `false`, includes envelope results neglecting section transformations: |

#### Example (Express Method `include_lc = false`)
```js
output_obj = StructureHelpers.ezDesignForces(
	S3D.results.getAll(true),
	S3D.model_data,
	action_list = ["axial", "bmd_y", "bmd_z", "sfd_y", "sfd_z", "torsion"],
	include_lc = false
);

//// The output objects format is as follows:
// output_obj = {
// 		member_id : {
// 			action : {
// 				max : 10,
// 				min : -12,
// 				abs_max : 12
// 			}
// 		}
// 	};

//// Example output object
// output_obj = {
// 		1: {
// 			axial : {
// 				max : 10,
// 				min : -12,
// 				abs_max : 12
// 			}
// 			bmd_y: {...},
// 			bmd_z: {...},
// 			...
// 		}
// 		...
// 	};
```

#### Example (Detailed Method `include_lc = true`)

```js
output_obj = StructureHelpers.ezDesignForces(
	S3D.results.getAll(true),
	S3D.model_data,
	action_list = ["axial", "bmd_y", "bmd_z", "sfd_y", "sfd_z", "torsion"],
	include_lc = true
);

//// The output object format is as follows:
// output_obj = {
// 		member_id : {
// 			load_comb_id : {
// 				action : {
// 					values : [-12, -5, 3.5, ... 10],
// 					max : 10,
// 					min : -12,
// 					abs_max : 12
// 				}
// 			}
// 		}
// };

//// Example output object
// output_obj = {
// 		1 : {
// 			1 : {
// 				axial : {
// 					values : [-12, -5, 3.5, ... 10],
// 					max : 10,
// 					min : -12,
// 					abs_max : 12
// 				},
// 				bmd_y: {...},
// 				bmd_z: {...},
// 				...
// 			},
// 			...
// 		},
// 		...
// };
```

### `UnitHelpers.convert()`

Convert units from one system to another. This is very useful when trying to control the inputs coming into your calculation.js file. For instance, say someone is using a model that is in ft, but your calculator only works for `mm`, you can use `UnitHelpers.convert( member_length , s3d_units.length, "mm");` to take it from whatever system the s3d_model is and translate that input to `mm`

```js
UnitHelpers.convert( value , unit_from, unit_to);

//examples:
UnitHelpers.convert( 1223 ,"ft", "in");
UnitHelpers.convert( 1223 , s3d_units.length, "mm"); //convert the S3D model unit to a fixed input unit
```

## Logger

The global `logger()` function is available to add to the quick design logs

## Warnings

The global `warn()` function is available to notify users of warning when running calculations

## Example

Below is an example of a more advanced integration for aluminimum design. It takes in the s3d_model and results, in order to compile an array of inputs. It imports the member's length, section properties and design forces.

```js
module.exports = function(s3d_model, analysis_results) {

    if (!analysis_results)  throw new Error("No Analysis Results. Please solve model first.");

    let s3d_units = s3d_model.settings.units;
    let materials = s3d_model.materials;
    let default_input = {"L":0,"b":null,"d":null,"t1":2.5,"t2":4.5,"J":0,"welded":"No","alloy":"6005","temper":"T5","Mz":1800000,"My":500000,"Vz":20000,"Vy":20000,"Nc":0,"Nt":20000}

    let all_design_forces = StructureHelpers.getDesignForces(analysis_results);

    let design_members = [];
    var members = s3d_model.elements;
    for (var i =0; i < members.length; i++) {
        var this_member = members[i];
        if (!this_member) continue;

        let this_member_input = JSON.parse(JSON.stringify(default_input)); //start with this
        let span_L = StructureHelpers.getMemberLength(s3d_model, i);
        let design_forces = all_design_forces[i];
		if (!design_forces) {
			logger("&nbsp; Member #" + i + " has no design forces, skipping member.");
			continue;
		}

        this_member_input.L = UnitHelpers.convert(span_L, s3d_units.length, "mm");
        this_member_input.Mz = UnitHelpers.convert(design_forces.Mz_abs, s3d_units.moment, "N-mm");
        this_member_input.My = UnitHelpers.convert(design_forces.My_abs, s3d_units.moment, "N-mm");
        this_member_input.Vz = UnitHelpers.convert(design_forces.Vz_abs, s3d_units.force, "N");
        this_member_input.Vy = UnitHelpers.convert(design_forces.Vy_abs, s3d_units.force, "N");
        this_member_input.Nc = UnitHelpers.convert(design_forces.Vx_pos, s3d_units.force, "N");
        this_member_input.Nt =  UnitHelpers.convert(design_forces.Vx_neg, s3d_units.force, "N");

        //sections data
        let section_id = this_member[2];
        let section_obj = s3d_model.sections[section_id];
        let material_id = section_obj.material_id;
        this_member_input.J = UnitHelpers.convert(section_obj.J, s3d_units.section_length+"^4", "mm^4");

        let shape = section_obj.aux.polygons[0].shape;
        let dims = section_obj.aux.polygons[0].dimensions;
        this_member_input.t1 = "";
        this_member_input.t2 = "";

        if (shape == "hollow rectangle") {
            this_member_input.shape = "hollow rectangular";
            this_member_input.s3d_section = section_id;
            this_member_input.legs = 2;
            this_member_input.b = UnitHelpers.convert(dims.b.value, s3d_units.section_length, "mm");
            this_member_input.d = UnitHelpers.convert(dims.h.value, s3d_units.section_length, "mm");
            this_member_input.t1 = UnitHelpers.convert(dims.t.value, s3d_units.section_length, "mm");
            this_member_input.t2 = UnitHelpers.convert(dims.tb.value, s3d_units.section_length, "mm");
        } else {
            this_member_input.shape = "custom";
            this_member_input.s3d_section = section_id;
            if (section_obj.aux.depth) this_member_input.d = UnitHelpers.convert(section_obj.aux.depth, s3d_units.section_length, "mm");
            if (section_obj.aux.width) this_member_input.b = UnitHelpers.convert(section_obj.aux.width, s3d_units.section_length, "mm");
            if (section_obj.aux.polygons[0] && section_obj.aux.polygons[0].alum) {
                var alum_obj = section_obj.aux.polygons[0].alum;
                if (alum_obj.hasOwnProperty("number_of_legs")) this_member_input.legs = alum_obj.number_of_legs;
                if (alum_obj.hasOwnProperty("leg_thickness")) this_member_input.t1 = UnitHelpers.convert(alum_obj.leg_thickness, s3d_units.section_length, "mm");
                if (alum_obj.hasOwnProperty("leg_height")) this_member_input.d = UnitHelpers.convert(alum_obj.leg_height, s3d_units.section_length, "mm");
            } 
        }

        if (!this_member_input.t2 && this_member_input.t1) this_member_input.t2 = this_member_input.t1; //just make them the same if blank

        //clean and round some data
        this_member_input.L = parseFloat(this_member_input.L.toFixed(0))
        this_member_input.J = parseFloat(this_member_input.J.toFixed(0))
        this_member_input.Mz = parseFloat(this_member_input.Mz.toFixed(0))
        this_member_input.My = parseFloat(this_member_input.My.toFixed(0))
        this_member_input.Vy = parseFloat(this_member_input.Vy.toFixed(0))
        this_member_input.Vz = parseFloat(this_member_input.Vz.toFixed(0))
        this_member_input.Nc = parseFloat(this_member_input.Nc.toFixed(0))
        this_member_input.Nt = parseFloat(this_member_input.Nt.toFixed(0))

        if (this_member_input.h) this_member_input.h = parseFloat(this_member_input.h.toFixed(0))
        if (this_member_input.b) this_member_input.b = parseFloat(this_member_input.b.toFixed(0))
        
        design_members[i] = this_member_input; //add to array

    }

    if (design_members.length == 0) { //always a good idea - tell the user why this could be the case
        throw new Error("No Members Imported. Check your materials are set to 'aluminum' and that the sections are hollow rectangular");
    }

    return design_members;

}

```

## Formatting Results

You can control the S3D Results table with the following options

| Key 				| Value 										 |
|-------------------|------------------------------------------------|
| `s3d_symbol` 		| The heading to show in the S3D Results table.	 |
| `s3d_info` 		| The info tip to show in the S3D Results table. |

## How to Test Code

To test your code, first start by creating a Draft. Then take the UID of that draft and run the following code in your S3D console:

```js
S3D.quick_design.import("my-uid")
```

This will open up the module on the left panel and run your latest `s3d_integration.js` file on the server.