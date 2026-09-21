---
id: quick-design-config
title: Config File
noIndex: true
---

The config.json file is an essential component of developing a Quick Design framework. This file contains both meta information that describes the calculator as well as input variable information that describes the inputs available in your calculator.

The config.json file serves as the foundation for your calculator's user interface which is generated directly from the file. You can customize the layout, appearance, and input variables of your calculator by editing the information provided in the config.json file.

## Layout

The config.json file uses the [JSON file format](https://www.json.org/json-en.html). At a high level the config starts with the following layout. 

```json
{
	"meta": {

	},
	"input_variables": {

	}
}
```

## Meta Information

The meta information is used to both describe the calculator as well as configure certain settings like access control.

| Key               | Required | Type                      |
|-------------------|----------|---------------------------|
| name              | TRUE     | `String`                  |
| short_description | TRUE     | `String`                  |
| long_description  | TRUE     | `String`                  |
| tags              | TRUE     | `Comma Separated String`  |
| access            | TRUE     | public \| private         |
| s3d_integrated    | FALSE    | `Boolean`                 |
| contact           | TRUE     | `Object`                  |

### Contact Object

When developing a calculator in the SkyCiv software framework, you may wish to provide information about the calculator's developer.

This is where the contact object comes into play. The contact object is an optional object that can be included in your calculator to display information about the developer. Specifically, this information is displayed in the 'View Module Info' option.

At a minimum this object must be include the email key. If no logo is included the SkyCiv Logo will be used. 

```json 
{
	"email": "Your Email",
	"name": "Your Name",
	"role": "Your Role",
	"company": "Your Company",
	"logo": "Logo URL",
	"custom_header_html": "(Optional. Add a html string here to add it to the top of the report"
}
```

:::tip
Include the logo in the images folder of the calc pack. Reference the logo as `/image_name.png` to use this option. 
:::

## Input Variable Information

The input_variable object contains a set of nested objects that are used to build the input form of your calculator. Essentially, you can think of this part of the calculator as a form builder.

Each element in the form is represented by a separate object within the input_variable object. The key of each object represents the name of the related input variable. These elements appear in the user interface in the same order as they are listed in the JSON.

By specifying the necessary information in the input_variable object, you can create a user-friendly input form for your calculator. You can customize each input element, including its label, data type, default value, and other attributes.

## Additional Input Variable Parameters

| Key                              | Value Type    | Description                                                                                        |
|----------------------------------|---------------|----------------------------------------------------------------------------------------------------|
| `s3d_only`       				   | `Boolean`     | If set to `true`, this input will be only be available in S3D.					                    |
| `disabled`       				   | `Boolean`     | If set to `true`, this input will be disabled (greyed out) and not editable.                       |
| `hidden`       				   | `Boolean`     | If set to `true`, this input will be permanently hidden (Input tab only).							|
| `hidden_all`       				   | `Boolean`     | If set to `true`, this input will be permanently hidden in all tabs.							|
| `exclude_from_input_table`       | `Boolean`     | If set to `true`, this input will be hidden from the main input table.                             |
| `exclude_from_input_table_s3d`   | `Boolean`     | If set to `true`, this input will be hidden from the main input table in S3D only.                 |
| `hide_info_tip_in_input_table`   | `Boolean`     | If set to `true`, the information tips will be hidden from the input table of the design report.   |
| `hide_label_in_input_table`      | `Boolean`     | If set to `true`, the label will be hidden from the input table of the design report.   		 	|
| `highlight_row`                  | `Boolean`     | If set to `true`, this input will be highlighted yellow in the input table.                        |
| `hide_in_s3d`                    | `Boolean`     | If set to `true`, this input will be hidden in the S3D input table. Value will still be returned.  |
| `disable_in_s3d`                 | `Boolean`     | If set to `true`, this input will be disabled in the S3D input table.                              |
| `hide_units_label`               | `Boolean`     | If set to `true`, this units will be hidden on the input panel (will still be visible in report).	|
| `batch_skip`               	   | `Boolean`     | If set to `true`, then this input will be skipped in batch run table.								|
| `display_units `             	   | `String`      | Overrides the units to display in the UI, report still shows the `units` key.						|
| `info_table `             	   | `String`      | Overrides the info tip in the Input Summary table.													|
| `label_table `             	   | `String`      | Overrides the label in the Input Summary table.													|

## Input Elements

Input elements allow they user to interact and adjust sections the element in the calculator's user interface.

### Number Element Example

```json
"section_width": {
	"type": "number",
	"label": "Section Width",
	"symbol": "S_{W}", //optional, but looks better on reports
	"units": "mm",
	"info": "The width of the section.",
	"default": 12,
	"min": 3, //used in validation
	"max": 400,
	"step": 1, //increments the input by this number
	"class": "section-width",
	"nullable": true,
	"integer": false // Only allows integer values (will round 8.9 > 9 or 1.1 to 1)
}
```

#### Dynamic Min/Max Logic

Dynamic min/max can be used to logically specify the min/max of an input based on another inputs value.

| Key					  | Description 														 			     | 
| ----------------------- | ------------------------------------------------------------------------------------ | 
| `greater_than` 		  | Ensures that the input will always be greater than the specified input.  			 | 
| `less_than` 			  | Ensures that the input will always be less than to the specified input.  			 | 
| `greater_than_or_equal` | Ensures that the input will always be greater than or equal to the specified input.  | 
| `less_than_or_equal` 	  | Ensures that the input will always be greater than or equal to the specified input.  | 
| `equal_to` 			  | Ensures that the input will always be equal to the specified input.  				 | 

##### Example

```js
"heading_1": {
	"type": "heading",
	"label": "Width > Height"
},
"section_width": {
	"type": "number",
	"label": "Section Width",
	"symbol": "S_{W}",
	"units": "mm",
	"info": "The width of the section.",
	"default": 16,
	"greater_than": "section_height"
},
"section_height": {
	"type": "number",
	"label": "Section Height",
	"symbol": "S_{W}",
	"units": "mm",
	"info": "The width of the section.",
	"default": 13
}
```

### Text Element Example

```json
"text_input": {
	"type": "text",
	"label": "Text Input",
	"default": "Some Text"
}
```

#### Display Inputs on One Row

In some cases it may be useful to combine certain input together to be displayed on the same row. 
Two number or text elements are able to be displayed on the same row using the `combine_with` key. 
The labels and tooltip of this combined row can be overridden using the `combined_label` and `combined_tooltip` keys.
In the report and calculations these inputs will still appear and be treated as if they were separate inputs. 

:::tip
The input you are combining with should always appear after the input that contains the `combine_with"` key. 
:::

*** Display Inputs on One Row Example ***

```json
"x_input": {
	"type": "number",
	"label": "X",
	"units": "mm",
	"info": "The X coordinate.",
	"default": 12,
	"min": 0,
	"max": 100,
	"step": 1,
	"combine_with": "y_input",
	"combined_tooltip": "The X and Y coordinates.",
	"combined_label": "X,Y Coordinates"
},
"y_input": {
	"type": "number",
	"label": "X",
	"units": "mm",
	"info": "The X coordinate.",
	"default": 12,
	"min": 0,
	"max": 100,
	"step": 1,
}
```

### Checkbox Element Example

```json
"checkbox_value": {
	"type": "checkbox",
	"label": "My Checkbox",
	"default": false
}
```

### Radio Buttons Element Example

```json
"radio_value": {
	"type": "radio",
	"label": "My Radio Buttons",
	"options": [
		{
			"selected": true,
			"name": "Button 1",
			"value": "value_1"
		},
		{
			"name": "Button 2",
			"value": "value_2"
		},
		{
			"name": "Button 3",
			"value": "value_3"
		}
	]
}
```

### Dropdown Element Example

```json
"dropdown_value": {
	"type": "dropdown",
	"label": "Dropdown Input",
	"options": [
		{
			"selected": true,
			"value": "maybe",
			"name": "Maybe"
		},
		{
			"value": "no",
			"name": "No"
		},
		{
			"value": "yes",
			"name": "Yes"
		}
	]
}
```

### Multiple Dropdown Element Example

Nullable `false` will reselect the default options if all selections are removed

```json
"multi_dropdown": {
			"type": "dropdown",
			"label": "Multi Dropdown",
			"multiple": true, 
			"nullable": false,
			"options": [
				{
					"selected": true,
					"value": "A",
					"name": "A"
				},
				{
					"selected": true,
					"value": "B",
					"name": "B"
				},
				{
					"value": "C",
					"name": "C"
				},
				{
					"value": "D",
					"name": "D"
				}
			]
		},
```

#### Optional Dropdown Keys

These optional keys can be added to the dropdown object (a the root level).

| Key         	  | Type    | Description                                      |
|-----------------|---------|--------------------------------------------------|
| use_search_icon | `bool`  | Replace the dropdown icon with a search icon.    |

### Table Element Example

*** Simple Example ***

```json
"table": {
	"type": "table",
	"label": "My Table",
	"table": {
		"name": "My Entry Table", // (Optional: To override popup name)
		"notes": "Some notes", // (Optional: Add a note below the table)
		"version": 2,
		"selector": "#my-entry-table", 
		"auto_new_row_on_enter_key": true,
		"auto_validate ": true,
		"remove_buttons": false, // (Optional: If true, removes the buttons above the table)
		"columns": [
			{
				"id": "number1",
				"title": "Number of Things",
				"tooltip": "Example tooltip",
				"default_value": 1.5,
				"minimum": 0,
				"exclusive_minimum": true,
				"type": "integer",
				"cell_type": "input_text",
				"cell_width": "auto",
				"disabled": false,
				"onChange": null
			}
		]
	}
}
```

*** Advanced Example ***

```js
"graphics_table": {
	"type": "table",
	"label": "Options",
	"min_rows": 1,
	"table": {
		"name": "Options", 
		"version": 2,
		"selector": "#my-entry-table", 
		"auto_validate ": true,
		"remove_buttons": true,
		"columns": [
			{
				"id": "name",
				"title": "Name",
				"default_value": "Dead",
				"type": "string",
				"cell_type": "input_text",
				"cell_width": "auto",
				"disabled": false,
				"onChange": null,
				"unique": true // (Optional) Force the column to be unique
			},
			{
				"id": "dropdown",
				"title": "Dropdown",
				"default_value": "X",
				"type": "string",
				"tooltip": "Axis",
				"cell_type": "dropdown",
				"cell_dropdown_values": ["X", "Z"],
				"cell_dropdown_labels": ["X-X", "Z-Z"],
				"cell_width": "auto",
				"disabled": false,
			},
			{
				"id": "dropdown",
				"title": "Dropdown",
				"default_value": "X",
				"type": "string",
				"tooltip": "Axis",
				"cell_type": "dropdown",
				"cell_dropdown_values": ["X", "Z"],
				"cell_dropdown_labels": ["X-X", "Z-Z"],
				"cell_width": "auto",
				"disabled": false,
			},
			{
				"id": "dropdown_boolean",
				"title": "Dropdown with Boolean",
				"default_value": true,
				"type": "string",
				"tooltip": "Show / hide?",
				"cell_type": "dropdown",
				"cell_dropdown_values": [true, false],
				"cell_dropdown_labels": ["Show", "Hide"],
				"cell_width": "auto",
				"disabled": false,
			},
			{
				"id": "checkbox",
				"title": "My Checkbox",
				"tooltip": "This is a checkbox",
				"type": "string",
				"cell_type": "checkbox",
				"default_value": true,
				"cell_width": "auto",
				"disabled": false,
			}
		]
	}
}
```

#### Optional Table Keys

These optional keys can be added to the table object (a the root level).

| Key          		| Type      | Description                                      |
|-------------------|-----------|--------------------------------------------------|
| min_rows     		| `int`     | Max rows allowed in the table.                   |
| max_rows     		| `int`     | Min rows allowed in the table.                   |
| default_data 		| `array`   | Array of objects for default data use in tables. |
| button_text  		| `string`  | Name for button text. Default 'Open Table'.	   |
| pagination   		| `boolean` | Turns on pagination in the table. 			   |
| pagination_rows   | `int` 	| The default number of rows for pagination.	   |
| selectable	    | `boolean` | Default `true`. Is the table selectable.		   |
| copy_paste		| `boolean` | Default `true`. Can you copy paste the table	   |

### Button Element Example

```json
"my_button": {
	"type": "button",
	"label": "Reset Form",
	"text": "Reset",
	"id": "reset"
}
```

**Binding to buttons in the ui.js**

You can bind to buttons in your ui.js to execute certain actions.
Ensure that you unbind the button before binding your click function:

```js
jQuery("#reset").unbind("click").click(function() {
	console.log("Reset button clicked");
});
```

### S3D Section Object

[S3D Integration Only] This will pass through the Section Object from your S3D model

```json
"s3d_section": {
	"type": "s3d_section",
	"label": "Section ID",
	"info": "Section Object imported from S3D model"
}
```

## Visual Elements

Visual elements are parts of the input form use to display information or improve the layout of the form. 

### Image Element Example

```json
"image": {
	"type": "image",
	"width": "50%",
	"src": "https://skyciv.com/wp-content/uploads/2022/06/SkyCiv_Logo_NoTagline_Dark.png.webp",
	"info": "SkyCiv Logo"
}
```

:::tip
Images can be served directly from the calc pack by including an images folder. Reference the image as `/image_name.png` to use this option. 
:::

#### Optional Image Keys

These optional keys can be added to the image object.

| Key             | Type      | Description                                      |
|-----------------|-----------|--------------------------------------------------|
| `height`        | `string`  | Set an explicit height for image.                |
| `max_width`     | `string`  | Set an explicit max width for image.             |
| `max_height`    | `string`  | Set an explicit maxheight for image.             |
| `border_radius` | `string`  | Set a border radius for the image.               |
| `qd_center`     | `boolean` | Set to `true` to center the graphic.  		   |


### Heading Element Example

```json
"heading_1": {
	"type": "heading",
	"label": "My Heading",
	"collapsed": false // Optional to start the heading section collapsed 
}
```

### Subheading Element Example

```json
"subheading_1": {
	"type": "subheading",
	"label": "My Sub Heading"
}
```

### Message Box Element Example

```json
"my_test_message": {
	"type": "message_banner",
	"label": "My Messge Banner"
}
```

### Canvas Element Example

```json
"canvas": {
	"type": "canvas",
	"id": "ui-canvas"
},
```

:::note
Experimental support for sending canvas elements containing SVG elements as base64 to the `calculate.js` has now been added.
To do this please include `base_64_to_report: true` as a key/value pair in the canvas element. 
:::

### Div Element Example

```json
"div": {
	"type": "div",
	"id": "ui-div"
},
```

#### Centering Div Elements for Graphics

The following optional keys can be added to the div element to center it in the middle of the screen.

| Parameter     		   | Description                                                                   |
|--------------------------|-------------------------------------------------------------------------------|
| `qd_center`   		   | Set to `true` to center the graphic.  										   |
| `allow_graphic_report`   | Set to `true` to allow the user to download the graphic as a PDF. 			   |
| `graphic_report_name`    | The name of the report if `allow_graphic_report` is true. 					   |
| `graphic_report_details` | Set to `true` to add details to the report if `allow_graphic_report` is true. |

## Visibility Options

This option allows users to show/hide certain parameters based on another field's input. 
For instance, if you have a dropdown to choose a shape, and want to show different inputs for circular VS rectangular, you can use use the `visible_variables` key:

These can be used with dropdown, checkbox and radio button type elements. 

:::tip
Note: For dropdown the visible_variables value options are checked amd unchecked
:::

```json
"shape": {
	"label": "Shape",
	"s3d_only": true,
	"type": "dropdown",
	"options": [
		{
			"value": "circular",
			"name": "Circular"
		},
		{
			"selected": true,
			"value": "hollow rectangular",
			"name": "Hollow Rectangular"
		}
	],
	"visible_variables": {
		"custom": [
			["show", "rect_image"],
			["show", "shape-dimensions"],
			["show", ".circular-input"]
		],
		"hollow rectangular": [
			["show", "rect_image"],
			["show", "b"],
			["show", "d"],
			["show", "t1"],
			["show", "t2"],
			["hide", ".circular-input"]
		]
	}
}
```

**Checkbox Example**

```json
"checkbox_value": {
	"type": "checkbox",
	"label": "Hide Dropdown",
	"default": true,
	"visible_variables": {
		"checked": [
			["show", "dropdown_value"]
		],
		"unchecked": [
			["hide", "dropdown_value"]
		]
	}
}
```

You can choose to show/hide based on the following options:
- `["show", "all"]` - will show all input variables
- `["hide", "all"]` - will hide all input variables (unless they also have a `visible_variables` key)
- `["show", "section_width"]` - will show the specific input section_width
- `["show", ".circular-input"]` - will show all inputs that have the class "circular-input"

:::tip
Want to add dynamic user interface elements like charts and drawings that can be updated based on user input? The canvas and div elements are perfect for the job, controlled from your ui.js file.
:::

## Settings (Optional)

The `settings` object is an optional object that you can add top level of your `config.json` to control some aspects of the reporting.
The following options are currently available:

| Key                                | Type        | Description                                                                                      |
|------------------------------------|-------------|--------------------------------------------------------------------------------------------------|
| `report_heading `                	 | `String`    | Override the calcualtor name for the report heading.								   			  |
| `use_simple_table `                | `Boolean`   | Use a simplified version of the input table instead with only the Description and Value columns. |
| `include_input_table`           	 | `Boolean`   | Set to false to hide the input table.                                                            |
| `include_headings_in_input_table`  | `Boolean`   | Set to true to add headings to input table.                                                      |
| `split_input_table_by_headings`  	 | `Boolean`   | Set to true to break the input table into multiple sections by headings.                         |
| `add_break_after_input_table`      | `Boolean`   | Set to true to add a section break after the input table.                                        |
| `include_summary_table`            | `Boolean`   | Set to false to hide the summary table.                                                          |
| `include_marketing`                | `Boolean`   | Set to false to hide the marketing footer.                                                       |
| `experimental_clean_report_units`  | `Boolean`   | Experimental option to print the units in equations in a cleaner fashion.                        |
| `disable_batch_run`  				 | `Boolean`   | Disables batch run option when true.						            				          |
| `beta_calculation`  				 | `Boolean`   | If true adds a BETA tag and warning message to the calcualtor.						              |
| `use_docs_as_centre_graphic`  	 | `Boolean`   | If true uses the docs.md as the center graphic.									              |
| `show_analysis_loader`  	 		 | `Boolean`   | If true shows and loading spinner while calculating.								              |
| `skip_rounding`  	 				 | `Boolean`   | If true skips rounding for results to help when performing module QA.				              |

## Template

```json
{
	"meta": {
		"name": "My First Calculator",
		"short_description": "A sample meta object.",
		"long_description": "A sample meta object to help developers get started with the quick design config.",
		"tags": "example, draft",
		"access": "public",
		"contact": {
			"name": "SkyCiv",
			"role": "Software Developer",
			"email": "support@skyciv.com",
			"company": "SkyCiv",
			"logo": "https://skyciv.com/media/logos/logo-pack/SkyCiv_Logo_Dark_Poweredby.png"
		}
	},
	"input_variables": {
		"canvas": {
			"type": "canvas",
			"id": "ui-canvas"
		},
		"num": {
			"type": "number",
			"label": "Number A",
			"units": "m",
			"default": 4,
			"min": 0,
			"max": 1000
		},
		"text_a": {
			"type": "text",
			"label": "Text Input",
			"default": "Some Text"
		}
	}
}
```