---
id: quick-design-integrating-qds
title: Integrating Quick Designs
noIndex: true
---

You can invoke Quick Design calculators within your calculate.js file to seamlessly integrate multiple Quick Design tools.

***Example***

```js
module.exports = async function (input_json) {

	const uid = '1002-column-buckling-calculator';
	const calc_json = {
		"support_conditions": "Fixed - Fixed",
		"L": 1,
		"A": 4000,
		"I": 200000,
		"E": 200000,
		"sigma_y": 260
	};
	
	let res = await callQDCalculator(uid, calc_json);
	logger(JSON.stringify(await res));

	//export your results to view in the UI
	var output = {
		'report': REPORT,
		'results': {}
	}

	return output;

};
```