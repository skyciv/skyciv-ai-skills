---
id: quick-design-chartjs
title: Chart JS Integration
noIndex: true
---

Quick Design reporting can include ChartJS Charts. Chart JS is a javascript charting library.
To learn how to setup different ChartJS chart types vist the [ChartJS documentation](https://www.chartjs.org/docs/latest/).

## Example Calculate.js with ChartJS 

```js
module.exports = async function (input_json) {

	const chartWidth = 400;
	const chartHeight = 400;
	const chartConfiguration = {
		type: 'bar',
		data: {
			labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
			datasets: [{
				label: 'Votes',
				data: [10, 20, 30, 15, 40, 30],
				backgroundColor: [
					'rgba(255, 99, 132, 0.2)',
					'rgba(54, 162, 235, 0.2)',
					'rgba(255, 206, 86, 0.2)',
					'rgba(75, 192, 192, 0.2)',
					'rgba(153, 102, 255, 0.2)',
					'rgba(255, 159, 64, 0.2)'
				],
				borderColor: [
					'rgba(255,99,132,1)',
					'rgba(54, 162, 235, 1)',
					'rgba(255, 206, 86, 1)',
					'rgba(75, 192, 192, 1)',
					'rgba(153, 102, 255, 1)',
					'rgba(255, 159, 64, 1)'
				],
				borderWidth: 1
			}]
		},
	};

	let chartHTML = await ChartJS.createChart(chartWidth, chartHeight, chartConfiguration);
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
ChartJS runs asynchronously, you need to add `async` to the top module.exports in your calculate.js.
:::

## Example of using ChartJS in UI.js

```js
var canvas = "<canvas id ='canvas-id'></canvas>" //Create empty HTML canvas element

jQuery('#centre-div').empty(); //Empty graphics div
jQuery('#centre-div').append(canvas); //Create canvas element within graphics div

//ChartJS Options
var chartWidth = 400;
var chartHeight = 400;
var chartConfiguration = {
	type: 'bar',
	data: {
		labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
		datasets: [{
			label: 'Votes',
			data: [10, 20, 30, 15, 40, 30],
			backgroundColor: [
				'rgba(255, 99, 132, 0.2)',
				'rgba(54, 162, 235, 0.2)',
				'rgba(255, 206, 86, 0.2)',
				'rgba(75, 192, 192, 0.2)',
				'rgba(153, 102, 255, 0.2)',
				'rgba(255, 159, 64, 0.2)'
			],
			borderColor: [
				'rgba(255,99,132,1)',
				'rgba(54, 162, 235, 1)',
				'rgba(255, 206, 86, 1)',
				'rgba(75, 192, 192, 1)',
				'rgba(153, 102, 255, 1)',
				'rgba(255, 159, 64, 1)'
			],
			borderWidth: 1
		}]
	},
};

var ctx = document.getElementById('canvas-id').getContext('2d'); 
new Chart(ctx, chartConfiguration); //Add chart to Canvas
```



