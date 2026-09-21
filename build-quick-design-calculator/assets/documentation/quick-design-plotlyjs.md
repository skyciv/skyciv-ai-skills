---
id: quick-design-plotlyjs
title: Plotly JS Integration
noIndex: true
---

Quick Design reporting can include PlotlyJS Charts. PlotlyJS is a javascript charting library.
To learn how to setup different PlotlyJS chart types vist the [PlotlyJS documentation](https://plotly.com/javascript/).

## Example Calculate.js with PlotlyJS 

```js
module.exports = async function (input_json) {

	const plotlyWidth = 400;
    const plotlyHeight = 400;

	let size = 100
	let x = new Array(size)
	let y = new Array(size) 
	let z = new Array(size)
	let i, j;

	for (i = 0; i < size; i++) {
		x[i] = y[i] = -2 * Math.PI + 4 * Math.PI * i / size;
		z[i] = new Array(size);
	}
	
	for (i = 0; i < size; i++) {
		for(j = 0; j < size; j++) {
			var r2 = x[i]*x[i] + y[j]*y[j];
			z[i][j] = Math.sin(x[i]) * Math.cos(y[j]) * Math.sin(r2) / Math.log(r2+1);
		}
	}
	
	let plotlyConfiguration = [ {
			z: z,
			x: x,
			y: y,
			type: 'contour'
		}
	];

    let chartHTML = await PlotlyJS.createPlotly(plotlyWidth, plotlyHeight, plotlyConfiguration);
    ReportHelpers.print('', chartHTML, '');

	//export your results to view in the UI
	var output = {
		'report': REPORT,
		'results': {}
	}

	return output;

};
```
:::caution
PlotlyJS runs asynchronously, you need to add `async` to the top module.exports in your calculate.js.
:::



