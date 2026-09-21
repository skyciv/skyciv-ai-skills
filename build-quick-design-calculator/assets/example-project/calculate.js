module.exports = async function (input_json) {

	//Input Declaration
	let {L, w, calculate_deflection, E, I_z} = input_json; //Retrieve variables from config.json input

	//Calculations
	let reaction_force = (w * L) / (2 * 1000);
	let peak_moment = (w * L**2)/(8 * 1000000); //Correction in units conversion

	if(calculate_deflection){ //If check deflection is true, carry out deflection calculations
		var peak_deflection = (5 * w * L**4) / (384 * E * I_z);
		var span_ratio = Math.round(L / peak_deflection);
		var span_ratio_string = "L/" + span_ratio;
	}

	//Reporting
	ReportHelpers.print(`Reaction Force`, `[math]Reaction = w*L/2 = ${reaction_force} kN[math]`, ``);
	ReportHelpers.print(`Peak Moment`, `[math]Moment = \\frac{w*L^2}{8} = ${peak_moment} kNm[math]`, ``);

	if(calculate_deflection){ //If check deflection is true, display deflection calculations
		ReportHelpers.print(`Peak Deflection`, `[math]Deflection = \\frac{5 * w * L^4}{384 * E * I_z} = ${peak_deflection} mm[math]`, ``);
		ReportHelpers.print(`Span Ratio`, `[math]Ratio = \\frac{L}{${span_ratio}}[math]`, ``);
	}

	ReportHelpers.drawGraph({ 	//Draw shear force diagram
		loads_array: [reaction_force,[reaction_force,-reaction_force],-reaction_force],
		member_length: L,
		loads_unit: "kN", 
		result_label: "Shear Force Diagram",
		result_label_x: "Beam Length", // Optional 
		graph_title: "SFD",
		color: "red",
		flip_axis: false // Optional to reverse the axis 
	})

	//Output
	var output = {
		'report': REPORT,
		'results': {
			'reactions_heading': {
				'label': 'Reactions and Member Forces',
				'units': 'heading',
			},
			'Reaction': {
				'label': "Reaction Force",
				'value': reaction_force,
				'units': 'kN'
			},
			'Peak_Moment': {
				'label': 'Peak Moment',
				'value': peak_moment,
				'units': 'kNm'
			}
		}
	};

	if(calculate_deflection){ 	//If check deflection is true, display deflection check outputs
		output.results['Deflection_Heading'] = {
			'label': 'Deflection',
			'units': 'heading'
		}
		output.results['Peak_Deflection'] = {
			'label': 'Peak Deflection',
			'value': peak_deflection,
			'units': 'mm'
		}
		output.results['Span_Ratio'] = {
			'label': 'Span Ratio',
			'value': span_ratio_string,
			'units': ''
		}
	}

	//Examples of other output types
	output.results.output_example_heading = {
		'label': 'Example Outputs',
		'units': 'heading',
	}
	output.results.safe_utility_ratio = {
		'label': 'Safe Utility Ratio',
		'value': 0.75, //Used for utilisation ratios.
		"units": "utility",
	}
	output.results.warn_utility_ratio = {
		'label': 'Warning Utility Ratio',
		'value': 0.95, //Used for utilisation ratios.
		"units": "utility",
	}
	output.results.fail_utility_ratio = {
		'label': 'Fail Utility Ratio',
		'value':1.1, //Used for utilisation ratios.
		"units": "utility",
	}
	output.results.utility_boolean = {
		'label': 'Pass / Fail Utility',
		'value': 0, //Used for pass/fail results. Value of 1 represents pass, 0 represents fail
		"units": "utility_boolean"
	}
	output.results.custom_utility = {
		'label': 'Custom Utility',
		"units": "custom_box", //Used to create custom utility outputs
		"value": "ALERT",
		"color": "#F2711C" //Assign colour of output here
	}

	return output;
};