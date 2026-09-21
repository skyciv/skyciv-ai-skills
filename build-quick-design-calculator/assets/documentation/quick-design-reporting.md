---
id: quick-design-reporting
title: Reporting
noIndex: true
---

import Color from '../src/components/Color.js'

---

SkyCiv Quick Design has an input library called ReportHelpers designed to help you format and write reports easily. 

## Basic Reporting

### Blocks 
Blocks are the lowest level of reporting and can be used to customize your reporting however you need it. We have a number of wrapper functions (shown in later functions) but this is the most direct way you can report. The variable `REPORT` is a global veriable that is accessible within your module.

```js
REPORT.block.new('K-Factor Calculations', 4);
	REPORT.block.addCalculation("AISC 360-10"); //will print on the left column
	REPORT.block.addCalculation('[math]K = \\frac{180° \\cdot BA}{\\pi \\cdot \\theta \\cdot T} - \\frac{R_i}{T}[math]', 'K-Factor Formula');
	REPORT.block.addCalculation('[math]\\text{Where:}\\ \\theta = \\text{Bend Angle, } T = \\text{Material Thickness, } BA = \\text{Bend Allowance, } R_i = \\text{Inner Radius}[math]');
	REPORT.block.addCalculation('[math]\\text{Given values:}\\ T = ' + T + '\\text{ mm, } R_i = ' + Ri + '\\text{ mm, } \\theta = ' + theta + '\\text{ degrees, } BA = ' + BA + '\\text{ mm}[math]');
	REPORT.block.addCalculation('[math]K = \\frac{180° \\cdot ' + BA + '}{\\pi \\cdot ' + theta + ' \\cdot ' + T + '} - \\frac{' + Ri + '}{' + T + '} = ' + K.toFixed(3) + '[math]', 'Calculated K-Factor');
	REPORT.block.addResult('K = ' + K.toFixed(3));
REPORT.block.finish();
```

## Text and Formatting Functions

### `ReportHelpers.getGlobalColors()`

Returns a list of global colors

```js
const colors = ReportHelpers.getGlobalColors();
```

#### Color Table

| Name                    | Color Swatch                            | Hex Value       |
|-------------------------|-----------------------------------------|-----------------|
| red                     | <Color color="#DB2828" />               | `#DB2828`       |
| green                   | <Color color="#21BA45" />               | `#21BA45`       |
| orange                  | <Color color="#F2711C" />               | `#F2711C`       |
| red_light               | <Color color="#B31E1E33" />             | `#B31E1E33`     |
| green_light             | <Color color="#16AB3933" />             | `#16AB3933`     |
| orange_light            | <Color color="#F2620233" />             | `#F2620233`     |
| fluro_green             | <Color color="#5EFF33" />               | `#5EFF33`       |
| fluro_red               | <Color color="#FF335E" />               | `#FF335E`       |
| fluro_orange            | <Color color="#E67E22" />               | `#E67E22`       |
| hightlight_blue         | <Color color="#7FB8E6" />               | `#7FB8E6`       |
| hightlight_blue_light   | <Color color="#D6EDFF" />               | `#D6EDFF`       |
| highlight_yellow        | <Color color="#F7DC6F" />               | `#F7DC6F`       |
| highlight_yellow_light  | <Color color="#F7DC6F33" />             | `#F7DC6F33`     |
| national_annex_color    | <Color color="#99C5C4" />               | `#99C5C4`       |
| subheading_blue		  | <Color color="#145DA0" />               | `#145DA0`       |
| table_header_grey		  | <Color color="#F7F7F7" />               | `#F7F7F7`       |
| text_black			  | <Color color="#000000DE" />             | `#000000DE`     |

### `ReportHelpers.getUtilityColor()`

Converts a number into a utility color

```js
const utility = ReportHelpers.getUtilityColor(0.1, false);

// For a semi transparent version
const utility_light_version = ReportHelpers.getUtilityColor(0.1, true);
```

### `ReportHelpers.heading()`

This will print a heading at the top of a new block. 

```js
let font_size = 3;
ReportHelpers.heading("My Heading", font_size, "reference (optional)");
```

### `ReportHelpers.print()`

This will print a clean formatted text in the left column of the report. Bold and italic options are available like markdown.

::note
If you add raw HTML to your print it will print that in the report.
::

```js
ReportHelpers.print("", "My text to print", "");
ReportHelpers.print("", "This is **BOLD** text", "");
ReportHelpers.print("", "This is *italic* text", "");
ReportHelpers.print("", "[math] a^2 + b^2 = c [math]", "");
```

<center><img src="/api/v3/img/qd/qd-print.png"/></center>

### `ReportHelpers.pageBreak()`

Add a page break in the report. All content below will start on a new page. 

```js
ReportHelpers.pageBreak();
```

### `ReportHelpers.subBreak()`

Add a sub break between sections. This is just to provide separation between different sections in the same block. 

```js
ReportHelpers.subBreak();
```

<center><img src="/api/v3/img/qd/sub-break.png"/></center>

### `ReportHelpers.lineResult()`

This will create a nice easy and lightweight reporting option. Rather than showing full equations, you might just want to print intermediate results:

Note: You will need to open a REPORT block for this to be visible:

```js
REPORT.block.new()
    ReportHelpers.lineResult("Max Shear force in  Member", "V_{y}", 22.43 + " kN")
    ReportHelpers.lineResult("Displacement Max", "\\gamma_y", max_def + " mm")
    ReportHelpers.lineResult("Design Load", "\\omega_x", 77.43 + " kNm")
    ReportHelpers.lineResult("Section Capacity", "\\gamma_{y2}", 123.43 + " kNm")
    ReportHelpers.lineResult("Remaining Capacity in Section", "\\gamma_{y3}", 46 + " kNm")
    ReportHelpers.lineResult("Design Load", "\\omega_x", 77.43 + " kNm")
    ReportHelpers.lineResult("Section Capacity", "\\gamma_{y2}", 123.43 + " kNm")
    ReportHelpers.lineResult("Remaining Capacity in Section", "\\gamma_{y3}", 46 + " kNm")
    ReportHelpers.lineResult("Remaining Capacity in Section", "\\gamma_{y3}", 46 + " kNm", "Some Reference")
    ReportHelpers.lineResult("Remaining Capacity in Section", "\\gamma_{y3}", 46 + " kNm", "Some Reference", "Result")
REPORT.block.finish()
```

<center><img src="/api/v3/img/qd/qd-simplified-reporting.png"/></center>

### `ReportHelpers.messageBox()`

Creates a nice looking message box for displaying error messages or warnings to the user. 

```js
ReportHelpers.messageBox("Message Body", "Message Title");

ReportHelpers.messageBox("Some warning", "Warning", "warning"); // With style option

ReportHelpers.messageBox("Some warning", "Warning", "default", "Some Reference", "Some Result"); // With reference and result.
```

<center><img src="/api/v3/img/qd/message_box.png"/></center>

##### Options

| Parameter       	  | Description                                                                                                       	   |
|---------------------|------------------------------------------------------------------------------------------------------------------------|
| Message Body    	  | The main content or message to display in the message box.                                                        	   |
| Message Title   	  | The title of the message box.                                                                                     	   |
| Style (optional)	  | The style of the message box, such as "warning" for a warning message.                                             	   |
| Reference (optional)| Additional information or reference related to the message, displayed in the message box.                          	   |
| Result (optional)   | Information or result related to the message, also displayed in the message box along with the reference, if provided. |


### `ReportHelpers.customFormat()`

Shortcut to format output in certain ways

```
ReportHelpers.customFormat("1111.98", "price_euro); => "1.111,98"
ReportHelpers.customFormat("1111.01", "euro); => "1.111,00"
```

### `ReportHelpers.list()`

Puts a list into the report. The options parameter and all its supported options are optional. 

```js
let my_list = ["mince", "onions", "garlic", "tomatoes"];
let my_list_opts = {
	"heading": "My Shopping List",
	"heading_size": 2,
	"reference": "Something",
	"list_type": "ordered"
}
ReportHelpers.list(my_list, my_list_opts);
```

##### Options

| Option         | Description                                      | Type             		   |
| -------------- | ------------------------------------------------ | ------------------------ |
| heading        | Specifies the heading for the shopping list      | String           		   |
| heading_size   | Sets the size of the heading (1-5)               | Number (1-5)    		   |
| reference      | Provides a reference or additional information   | String           		   |
| list_type      | Specifies the type of list (ordered/unordered)   | "ordered" or "unordered" |

### `ReportHelpers.padding()`

Adds 2px of padding to the report.

```js
ReportHelpers.padding();
```

## Tables, Graphs and Images

### `ReportHelpers.drawGraph()`

Will draw a nice BMD/SFD diagram with a simple array:

<center><img src="/api/v3/img/qd/sfd-graph.png"/></center>

```js
//This function takes in an array of values and plots them at even intervals along the graph x-axis. To draw a step in the curve, insert a sub-array into the loads_array input (example below)

ReportHelpers.drawGraph({
    loads_array: [0.3, 0.3, 0.3, [0.3, -0.3], -0.3, -0.3],
    member_length: 14,
    loads_unit: "kN", 
    result_label: "Shear Force Diagram",
    result_label_x: "Column Length", // Optional 
    graph_title: "SFD",
    color: "red",
    flip_axis: false // Optional to reverse the axis 
});
```
---

### `ReportHelpers.image()`

Will print an image in the report

```js
ReportHelpers.image({
	new_block: true, //if you already have a block open, set this to false
	src: "https://skyciv.com/wp-content/uploads/2023/03/reference-1-qf.png"
});
```

:::tip
Images can be hosted/served directly from the calc pack by including an images folder. Reference all images included in the image directory as `/image_name.png`.
:::

---

### `ReportHelpers.quickTable()`

Create and display data in a table format.

```js
// QUICK TABLES
let table_data = [
	["Heading 1", "Heading 2", "Heading 3"],
	["Some Result", "1223", "kN"],
	["Some Other Result", "0.234", "MPa"],
	["<h3>Add some Subheading with just one input</h3>"],
	["Some Result", "1223", "kN"],
	["Some Other Result", "0.234", "MPa"],
	["Some Other Result", "0.234", "MPa"],
];

let options = {
	heading: "Simplified Table Method",
	widths: ["50%", "25%", "25%"],
	text_aligns: ["left", "right", "center"], //or just "center"
	reference: "Clause 1.2.3 AISC", 
	compressed: false // True the table only takes as much room as needed
};

ReportHelpers.quickTable(table_data, options);
```

<center><img src="/api/v3/img/qd/qd-quick-table.png"/></center>

##### Advanced Table Options

**Merging Cells Example**

- Use the `merge_left` text to merge cells to the left.
- Use the `merge_up` text to merge cells upwards.

```js
// QUICK TABLES
let table_data = [
	["Force", "Axis", "Value", "Units"],
	["Shear", "X", "45", "kN" ],
	["merge_up", "Y", "12", "kN" ],
	["merge_up", "Z", "N/A", "merge_left" ],
	["Moment", "X", "30", "kN-m" ],
	["merge_up", "Y", "31.5", "kN-m" ],
	["merge_up", "Z", "N/A", "merge_left" ]
];

let options = {
	heading: "Simplified Table Method",
	widths: ["40%", "20%", "20%",  "20%"],
	text_aligns: ["left", "center", "center", , "center"], //or just "center"
	reference: "Clause 1.2.3 AISC",
	note: "This is a note",
};

ReportHelpers.quickTable(table_data, options);
```

- Cell Coloring `options.cell_backgrounds` 
	- Takes an array of arrays in the format [row_idx, column_idx, hex_code].
- With `ReportHelpers.tableColorCritical` 
	- Easily color the max values in a table based on columns/rows.
- With `ReportHelpers.tableColorUtility` 
	- Easily color a column based on utility values rules. Automatically includes columns that contain the words `utility` or if specified.

***Example ReportHelpers.tableColorCritical***
```js
let cell_backgrounds = ReportHelpers.tableColorCritical(
	data = table_data,
	cols =  [2,3,4],
	color = "#FFF18A",
	rows = false,
	absmax = true
);
let options = {
	text_aligns: "center", 
	cell_backgrounds: cell_backgrounds
};
// print out the table for shear
ReportHelpers.quickTable(table_data, options);
```

<center><img src="/api/v3/img/qd/qd_table_colouring_2.png"/></center>

***Rows Example ReportHelpers.tableColorCritical***
```js
let cell_backgrounds = ReportHelpers.tableColorCritical(
	data = table_data,
	cols =  [8],
	color = "#FFF18A",
	rows = true,
	absmax = false
);
let options = {
	text_aligns: "center", 
	cell_backgrounds: cell_backgrounds
};
// print out the table for shear
ReportHelpers.quickTable(table_data, options);
```

<center><img src="/api/v3/img/qd/qd_table_colouring_1.png"/></center>

***Example ReportHelpers.tableColorUtility***
```js
// QUICK TABLES
let table_data = [
	["Heading 1", "Utility", "X", 'Y'],
	["Some Result", 1, 4, 6],
	["Some Result", 1.1, 2, 6],
	["Some Result", 0.94, 0.23, 6],
	["Some Result", 0.04, 0.96, 6]
];

let options = {
	heading: "Simplified Table Method",
	cell_backgrounds: ReportHelpers.tableColorUtility(table_data, [3]),
};

ReportHelpers.quickTable(table_data, options);
```


## Maths, Formulas and Status

### `ReportHelpers.round()`

Will round any number to 2 decimal places, or if you provide a second argument it will round to that figure. It will work with strings and handle NaNs without crashing.

This will return a number back, that way you can continue to use this as a number (not a string)

```js
ReportHelpers.round(0.432731); // 0.43
ReportHelpers.round(0.432731, 4); // 0.4327
ReportHelpers.round("1.736242"); // 1.74
ReportHelpers.round(6, -1); // 10
ReportHelpers.round(64, -1); // 60
ReportHelpers.round(65, -1); // 70
ReportHelpers.round(650, -2); // 600
```

---

### `ReportHelpers.formula()`

Will automatically evaluate and print an equation to represent the result. Note: .formula() does not support {} characters. For this you will need to use lower level REPORT functions. Please do not include mathjax `[math][math]` tags as this will stop the formula from evaluating correctly.

```js
var moi = ReportHelpers.formula({
    "formula": "I_y = b * Math.pow(h, 3) / 12",
    "variables": {
        "b": b,
        "h": {
			value: h,
			unit: "mm", // OPTIONAL: To add unit systems to formula 
			dec_places: 4 // OPTIONAL: To locally round a variables separate to the global formula rounding 
		},
    },
    "units": "mm^4",
    "dec_places": 2,
    "intermediate_result": true, 
    "reference": "Clause 1.2.3 AISC",
    "print_result_as_utility": true,
	"heading": "Formula Heading" // OPTIONAL
	"nan_result": 0 // OPTIONAL what to return when the funciton evaluate results with NaN (.i.e 0/0). Default 0.
}); // will return the value of moi
```

#### Max and Min Functions

You can use 'Math.min' and 'Math.max' functions with `ReportHelpers.formula()`. Normal MathJax formatting is not available with this option. An example is below:

```js
ReportHelpers.formula({
	"formula": "max_value = Math.max(A, B)",
	"variables": {
		"A": 1,
		"B": 2
	},
	"dec_places": 2,
	"compact": true,
	"intermediate_result": true,
	"print_result_as_utility": true
});
```

##### Parameters

| Field                     | Description                                                                                                                                             |
|---------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| `formula`                 | The formula to use for the equation in [MathJax](https://docs.mathjax.org/).                   													      |
| `variables`               | The set of variables with their values to sub into the equation. Values can be a number or can also be a object with keys { value: value, unit: unit }. |
| `units`                   | Unit for final results.                                                                        													      |
| `dec_places`              | Number of decimal places to round final results too.                                           														  |
| `compact` 				| ***OPTIONAL***: Force all of the equation and result onto one line.				            														  |
| `intermediate_result`     | Include a intermediate step where values are subbed into the original equation.                												          |
| `new_line_intermediate`   | ***OPTIONAL***: Put intermediate step on a new line.   							            												          |
| `reference`               | Prints the reference of the equation in the left column.                                                  											  |
| `print_result_as_utility` | ***OPTIONAL***: Prints the result as a utility ratio on the right column of report.            														  |
| `exclude_result	` 		| ***OPTIONAL***: Don't print the result line.																											  |
| `expected_result` 		| ***OPTIONAL***: Check that the formula evaluates to an expected result, throws an error if the results don't match.									  |
| `convert` 				| ***EXPERIMENTAL***: Convert the result to a new units system (i.e. m -> mm). Unit for final results must be deinfed to work. Refer to notes below.	  |

*** Parameter - convert ***

Experimental module to allow use to conver tin the formula (i.e. turn meters into millimeters). 
Please confirm this is working correctly for your units before using.
Currently this does not work with min and max formulas.

```js
"convert": {
	"units": 'mm' // Units to convert to
	"dec_places": 2 // Optional: Decimal places to round to
	"update_result": true // Optional: Update the final result with converted units.
}
```

###### Output

<center><img src="/api/v3/img/qd/qd-formula.png"/></center>

:::tip
You can include Greek Alphabet Characters in the formula by copying the character from this [link.](https://skylinecollege.edu/boo/greek.php). This will work better thing including them with MathJax.
:::

:::danger
The `^` symbol in Javascript works as a XOR operator and will break your equations. Please insure you use Math.pow() instead. 
:::

### `ReportHelpers.printMathjax()`

A helper to let you easily print MathJax in cases where `ReportHelpers.formula()` falls short. 

```js
// example with left and right text
// note that * is expanded to \\times by function for display
ReportHelpers.printMathjax("1 * 2", "left text", "right text")

// example bracket grouping
// note A / B / C is invalid, should have brackets to specify ordering to not be ambiguous
ReportHelpers.printMathjax(`F'_nt = A / B + (C * D) / E + F / (G * H) - (A - 1) / (B + 1) = ${1}`, "2")

// example USA LRFD with min func
// note: when using min should but space between , and variable name so , isnt considered
// to be a part of a variable name
// note: ϕ could be replaced with \\phi in this instance
ReportHelpers.printMathjax(`F'_nt = min(1.3 * F_{nt} - F_nt / (ϕ * F_nv) * (F_v) / (A_b) , F_nt )`, "3")

// USA ASD example
ReportHelpers.printMathjax(`F'_{nt} = min(1.3 * F_{nt} - ( F_nt * Ω ) / (F_nv)  * (F_v) / (A_b) , F_nt )`,"4")

// example with sqrt
ReportHelpers.printMathjax(`T_⊥ = v_z / (a * \\sqrt{2}) - v_perp / ((a * \\sqrt{2}))`, "5")

// function where , is a part of variable name
ReportHelpers.printMathjax(`F_vw,Rd = a * β_Lw * f_vw,d = a * β_Lw * (f_u * 0.577) / (β_w * γ_M2)`, "6")


// example with units
// anything in side a text is not modified by the parser (the space remains as it is by putting in text)
// the / is also not interpretted as a divide symbol inside the text group
ReportHelpers.printMathjax(`F_vw,Rd = ${1000} \\text{ N/mm} = ${1} \\text{ kN/mm}`)
```

:::tip
Checkout the sample repo [here](https://platform.skyciv.com/dev/quick-design?uid=samples/printMathjax) to see it in action.
:::

### `ReportHelpers.printStatus()`

This will automatically format a clean color-based result on the right side of the table. It will automatically read a value, and if it is > 1 it will show a red FAIL. If it is < 1, it will show a green PASS:

```js
REPORT.block.new();
	ReportHelpers.printStatus(0.128, true);
REPORT.block.finish();

//OR - if you want to create a new block
ReportHelpers.printStatus(0.888, false);
```

#### `ReportHelpers.getStatusBlock()`

This will automatically return the ***html*** of the clean color-based result from `ReportHelpers.printStatus()`

```js
let status_block_html = ReportHelpers.getStatusBlock(0.128);
```

### `ReportHelpers.printCustomStatus()`

This will automatically format a clean color-based result on the right side of the table. 
If you pass in pass, fail or warn then colors will be automatically assigned otherwise you can specify custom colors with the last parameter

```js

// Parameters
// ReportHelpers.printCustomStatus(text, use_existing_block, background_color)

REPORT.block.new();
	ReportHelpers.printCustomStatus('Pass', true, '#2185D0'); // Blue Pass Utility Status
REPORT.block.finish();

//OR - if you want to create a new block
ReportHelpers.printCustomStatus('Pass', false); // Green Pass Utility Status
ReportHelpers.printCustomStatus('OK', false, '#2185D0'); // Blue Custom OK Utility Status
```

#### `ReportHelpers.getStatusBlock()`

This will automatically return the html of the clean color-based result from `ReportHelpers.getCustomStatusBlock()`

```js
// Parameters
// ReportHelpers.getCustomStatusBlock(text, background_color)

let status_block_html = ReportHelpers.getCustomStatusBlock('Pass', '#2185D0'); // Blue Pass Utility Status
let status_block_html = ReportHelpers.getCustomStatusBlock('Pass'); // Green Pass Utility Status
```

## Conversion

### `ReportHelpers.convert()`

Converts units

```js
ReportHelpers.convert(10, "in", "mm"); //254
ReportHelpers.convert(10, "kN", "kip"); //2.2480894244319
ReportHelpers.convert(2352, "mm", "m"); //2.352 
```

:::tip
For a list of supported units see [Quick Design Units](https://skyciv.com/api/v3/docs/quick-design-units/)
:::

---

## Tips

:::tip
MathJax in the QD Framework replaces / with //. This will differ from equations you might find in the [MathJax Documentation](https://docs.mathjax.org/)
:::

:::tip
To add a space in pure MathJax, such as a space in the symbol key used in config.js you can use `  \\  `;
:::

## Full Width Blocks

To include a full width block without a REFERENCES or RESULTS column you can use the `ReportHelpers.customFullBlock(obj);` function. This function
takes the following options:

| Parameter     | Description                                                                                                                     |
|---------------|---------------------------------------------------------------------------------------------------------------------------------|
| `title`       | Title that is automatically added to the full width block.              													      |
| `content`   	| The HTML content to add to the full width block. This must be all the content to be included you cannot add more content later. |
| `font_size`   | Font size of the heading in the block (default 3 `i.e <h3> tags`).            												  |
| `margin_left` | Margin left of the title in pixels or %. Default 10%.                                       									  |

As this block takes html you can use some lower level functions to return the HTML of some of the above functions. These include:

| High Level Function 		   | Low Level Function 			  |
|------------------------------|----------------------------------|
| `ReportHelpers.quickTable()` | `ReportHelpers.quickTableHTML()` |
| `ReportHelpers.image()`      | `ReportHelpers.imageHTML()`      |
| `ReportHelpers.lineResult()` | `ReportHelpers.lineResultHTML()` |

## Summary Reporting

The summary report is a simple one page report that list the key input, outputs, intermediate results and relevant graphics.

### Summary Report Methods

#### ReportHelpers.addKeyImage(key_image);

This method takes either a image url, base64 string or pure svg html. In the case of svg html it converts the image to base64 for the report. 
By default this is done on a 400 wide by 380 tall canvas, however for better scaling you can specify the rendering width in the summary report settings.

#### ReportHelpers.addSecondaryKeyImage(key_image);

Adds a secondary image, so long as "key_image_own_line" is set to `true`;

#### ReportHelpers.addIntermediateResults(name, value);

Adds an intermediate result to the report.

### Summary Report Settings

You can specify summary report settings by including the `summary_report_settings` object in the calculate.js output. 

**Example**

```js
	"summary_report_settings": {
		"key_image_own_line": true,
		"key_image_width": key_image_width,
		"key_image_height": key_image_height
	}
```

**Supported Settings**

| Setting                   	 | Default   | Description                                                                                                                     |
|--------------------------------|-----------|---------------------------------------------------------------------------------------------------------------------------------|
| `key_image_own_line`     		 | `false`   | Add the key image on its own line.																				               |
| `key_image_width`     		 | `400`   	 | The canvas width (px) to render svg key images on.																			   |
| `key_image_height`     		 | `380`   	 | The canvas height (px) to render svg key images on.																			   |
| `secondary_key_image_width`    | `400`   	 | The canvas width (px) to render svg key images on.																			   |
| `secondary_key_image_height`   | `380`   	 | The canvas height (px) to render svg key images on.																			   |
| `intermediate_results_columns` | `2`	   	 | The number of columns to show in intermediate results.																	 	   |
