module.exports = async function (input_json) {

	//Input Declaration
	let {} = input_json; //Retrieve variables from config.json input

	//Calculations

	//Reporting
	

	var output = {
		'report': REPORT,
		'results': {
			'heading': {
				'label': 'Heading',
				'units': 'heading',
			}
		}
	};

	return output;
};