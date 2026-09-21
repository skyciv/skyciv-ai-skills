---
id: quick-design-ui-helpers
title: UI Helper Functions
noIndex: true
---

The following helper functions have been made available in the `ui.js` to make the input form easier to modify. 

## Set and Get Inputs

:::note
Where possible, use the `setInputValues` over multiple `setInputValue` for better ui performance. 
:::


| Function                                                          	   			| Description       						         					 	                            | 
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | 
| `SKYCIV_DESIGN.ui.helpers.setInputValue(key, value, highlight, highlight_type)`   | Sets the value of an input. If `highlight` is true, turns the row green if `highlight_type` is `success` (default) or red if `error` after updating. | 
| `SKYCIV_DESIGN.ui.helpers.setInputValues(obj)`             			   			| Takes an object of key-value pairs to set multiple inputs at once.							    | 
| `SKYCIV_DESIGN.ui.helpers.getInputValue(key)`                                     | Returns the value from `SKYCIV_DESIGN.getData()[key]`.                                            |
| `SKYCIV_DESIGN.ui.helpers.getCurrentInputValue(key)`             		  			| Get the current input value from the design config even if it has been updated.       			| 

## Edit Input States

| Function                                                          	   | Description       						         					 	                            | 
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | 
| `SKYCIV_DESIGN.ui.helpers.setInputDisabled(key)`                 		   | Sets an input to disabled.											 	                            | 
| `SKYCIV_DESIGN.ui.helpers.setInputEnabled(key)`                   	   | Enables a disabled input.  					  	 					                            | 
| `SKYCIV_DESIGN.ui.helpers.setInputsDisabled(keys)`                 	   | Sets multiple inputs to disabled.											 	                    | 
| `SKYCIV_DESIGN.ui.helpers.setInputsEnabled(keys)`                   	   | Enables multiple disabled inputs.  					  	 					                    | 
| `SKYCIV_DESIGN.ui.helpers.isInputDisabled(key)`                   	   | Check if an input is disabled.  					  	 					                        | 
| `SKYCIV_DESIGN.ui.helpers.hideInput(key)`                   	           | Hides an input. 					  	 	               				                            | 
| `SKYCIV_DESIGN.ui.helpers.showInput(key)`                   	           | Shows an input.             					  	 					                            | 
| `SKYCIV_DESIGN.ui.helpers.hideInputs(keys)`                   	       | Hides inputs. 					  	 	               				                            	| 
| `SKYCIV_DESIGN.ui.helpers.showInputs(keys)`                   	       | Shows inputs.             					  	 					                           		| 
| `SKYCIV_DESIGN.ui.helpers.isInputVisible(key)`                   	       | Check if an input is hidden.            					  	 					                | 
| `SKYCIV_DESIGN.ui.helpers.isInputErrored(key)`                   	       | Check if an input is currently errored.            					  	 					    | 

## Dynamically Update Dropdowns

| Function                                                          	   | Description       						         					 	                            | 
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | 
| `SKYCIV_DESIGN.ui.helpers.updateDropdownValues(key, new_values)`  	   | Updates the dropdown options for a key with new values.  						 					| 
| `SKYCIV_DESIGN.ui.helpers.getDropdownValues(key)`                 	   | Get the current dropdown values for a key.  						 					            | 
| `SKYCIV_DESIGN.ui.helpers.setDropdownValueDisabled(key, value)`     	   | Disables a dropdown value. `value` can be a string or array of strings.  						 	| 
| `SKYCIV_DESIGN.ui.helpers.setDropdownValueEnabled(key, value)`      	   | Enables a dropdown value. `value` can be a string or array of strings.  							| 
| `SKYCIV_DESIGN.ui.helpers.setDropdownValueHidden(key, value)`       	   | Hides a dropdown value. `value` can be a string or array of strings.								| 
| `SKYCIV_DESIGN.ui.helpers.setDropdownValueVisible(key, value)`       	   | Shows a dropdown value. `value` can be a string or array of strings.  								| 

## Dynamically Update Min/Max/Step

| Function                                                          	   | Description       						         					 	                            | 
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | 
| `SKYCIV_DESIGN.ui.helpers.updateStep(key, value)`      	       		   | Update the step for the input.																		|
| `SKYCIV_DESIGN.ui.helpers.updateMin(key, value, update)`      	       | Update the min for the input. If `update` is true, ensures the current value is at least the min. |
| `SKYCIV_DESIGN.ui.helpers.updateMax(key, value, update)`      	       | Update the max for the input. If `update` is true, ensures the current value is at most the max. |
| `SKYCIV_DESIGN.ui.helpers.getCurrentMin(key)`      	                   | Get the current min value, considering dynamic constraints (e.g., `greater_than_val`, `greater_than_or_equal_val`). |
| `SKYCIV_DESIGN.ui.helpers.getCurrentMax(key)`      	                   | Get the current max value, considering dynamic constraints (e.g., `less_than_val`, `less_than_or_equal_val`). |
| `SKYCIV_DESIGN.ui.helpers.getCurrentStep(key)`      	                 | Get the current step value for an input. |

## Dynamically Update Config Appearance

| Function                                                          	   | Description       						         					 	                            | 
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | 
| `SKYCIV_DESIGN.ui.helpers.hideHeading(key)`      	                       | Hides a heading.                				 						                            |
| `SKYCIV_DESIGN.ui.helpers.showHeading(key)`      	                       | Shows a heading.                				 						                            |
| `SKYCIV_DESIGN.ui.helpers.hideByClass(class_name)`                       | Hides elements by class selector.                                                                  |
| `SKYCIV_DESIGN.ui.helpers.showByClass(class_name)`                       | Shows elements by class selector.                                                                  |
| `SKYCIV_DESIGN.ui.helpers.updateLabel(key, label_text, preserve_popup)`  | Updates a label in the UI only. `preserve_popup` defaults to true.                                 |
| `SKYCIV_DESIGN.ui.helpers.returnLabelToDefault(key)`                     | Returns label to the default in the config.json.                                                   |
| `SKYCIV_DESIGN.ui.helpers.updateTooltip(key, tooltip_text)`  			   | Updates a tooltip in the UI only. 										                            |
| `SKYCIV_DESIGN.ui.helpers.returnTooltipToDefault(key)`                   | Returns tooltip to the default in the config.json.                                                 |
| `SKYCIV_DESIGN.ui.helpers.updateImage(key, img_url)`                     | Updates an image as long as it is hosted in the images folder.      	                            | 

## Tables

| Function                                                          	   | Description       						         					 	                            | 
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | 
| `SKYCIV_DESIGN.ui.helpers.updateTableDropdown(table, dropdown, values)`  | Updates the dropdown options in a table column. `values` is array of  `{ value: 'X', label: 'X' }`.| 
| `SKYCIV_DESIGN.ui.helpers.addTableCellDisabled(table, row, col)`  	   | Disable a table cell. `row` and `col` are integers indexed from 0.									| 
| `SKYCIV_DESIGN.ui.helpers.removeTableCellDisabled(table, row, col)`  	   | Enable a table cell. `row` and `col` are integers indexed from 0.									| 
| `SKYCIV_DESIGN.ui.helpers.addTableColDisabled(table, col)`  	  		   | Disable a table column. `col` is an integer indexed from 0.										| 
| `SKYCIV_DESIGN.ui.helpers.removeTableColDisabled(table, col)`  	  	   | Enable a table column. `col` is an integer indexed from 0.											| 
| `SKYCIV_DESIGN.ui.helpers.clearAllTableCellDisabled(table)`  	  	   	   | Enable all cells and columns in a table.															| 
| `SKYCIV_DESIGN.ui.helpers.hideTableColumn(table, key)`                   | Hides a table column by key.                                                                      	|
| `SKYCIV_DESIGN.ui.helpers.showTableColumn(table, key)`                   | Shows a table column by key.                                                                      	|
| `SKYCIV_DESIGN.ui.helpers.disableTableColumn(table, key)`                | Disables a table column by key.                                                                   	|
| `SKYCIV_DESIGN.ui.helpers.enableTableColumn(table, key)`                 | Enables a table column by key.                                                                    	| 

## Import Data with Callbacks

| Function                                                       									   | Description       						         					 	                            | 
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | 
| `SKYCIV_DESIGN.ui.helpers.requireJSON(name, callback, extra_data)`		  						   | Load a .json file from the `/json` directory. `callback` and `extra_data` are optional.                   			| 
| `SKYCIV_DESIGN.ui.helpers.requireCSV(name, callback, extra_data)`		   							   | Load a .csv file from the `/csv` directory. `callback` and `extra_data` are optional.                   			| 
| `SKYCIV_DESIGN.ui.helpers.requireUtil(name, callback)`		           							   | Load a utility file. `callback` is optional.                   			                            |
| `SKYCIV_DESIGN.ui.helpers.getSection(selections, unit_system, callback, skip_error, error_callback)` | Fetch structural section properties from the database by keys (e.g., `['American', 'AISC', 'I-Beams', 'W10X49']`). Results are cached in sessionStorage. `selections` is an array of keys, `unit_system` specifies units (e.g., 'Metric' or 'Imperial'). `callback`, `skip_error`, and `error_callback` are optional. | 
| `SKYCIV_DESIGN.ui.helpers.getMaterial(selections, callback, error_callback)`			  			   | Fetch material properties from the database by keys (e.g., `['Metric', 'Aluminium', 'AluminiumAlloy']`). Results are cached in sessionStorage. `selections` is an array of keys. `callback` and `error_callback` are optional.	| 
| `SKYCIV_DESIGN.ui.helpers.getSectionTree(filters, callback)`			   							   | Get hierarchical **section library tree** from database.<br/>**Available filters:**<br/>`country` - e.g., `'American'`, `'European'`<br/>`library` - e.g., `'AISC'`, `'DIN'`, `'ADM'`<br/>`shape` - e.g., `'I-Beams'`, `'Channels'`, `'Zees'`<br/>Combine filters to narrow results. Optional: `callback`       							                            | 
| `SKYCIV_DESIGN.ui.helpers.getMaterialTree(filters, callback)`			   							   | Get hierarchical **material library tree** from database.<br/>**Available filters:**<br/>`units` - e.g., `'Metric'`, `'Imperial'`<br/>`material` - e.g., `'Steel'`, `'Aluminium'`, `'Concrete'`<br/>Combine filters to narrow results. Optional: `callback`							                                | 

## CSV Helpers
								
| Function                                                          									 | Description       						         					 	                            | 
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | 
| `SKYCIV_DESIGN.ui.helpers.csvToJSON(csv_string, header_row, delimiter)`  								 | Parses a CSV string into a flat array of objects. `header_row` defaults to `true`, `delimiter` defaults to `','`. Returns `{ csv_headers, csv_data }` where `csv_data` is an array of row objects keyed by header names. | 
| `SKYCIV_DESIGN.ui.helpers.csvToNestedJSON(csv_string, header_row, num_of_selector_columns, delimiter)` | Parses a CSV string into a nested object structure. The first `num_of_selector_columns` columns are used as nested keys, and the remaining columns become leaf data (auto-parsed to numbers where possible). Returns `{ csv_headers, csv_data }` where `csv_data` is a nested object. |


## Other

| Function                                                          	  		| Description       						         					 	                         | 
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | 
| `SKYCIV_DESIGN.ui.helpers.getKeysChanged()`  							   		| Get a list of keys changed since the last UI update.  					                         | 
| `SKYCIV_DESIGN.ui.helpers.wasInputChanged(key)` 						   		| Check if an input key was changed. `key` can be a string or array of strings.						 | 
| `SKYCIV_DESIGN.ui.helpers.callBackend(input_json, callback, error_callback)` 	| Call the backend of the current calculator. `callback` and `error_callback` are optional.			 | 
| `SKYCIV_DESIGN.ui.helpers.isInputLocked(key)` 						   		| Check if an input is locked.									                            		 | 
| `SKYCIV_DESIGN.ui.helpers.allInputsUnlocked()` 						   		| Check if all inputs are unlocked.									                            	 | 
| `SKYCIV_DESIGN.ui.helpers.isInputDropdown(key)` 						   		| Check if an input is a dropdown type.									                             | 
| `SKYCIV_DESIGN.ui.helpers.getDefaultValue(key)` 						   		| Get the default value for an input from config.									                 | 
| `SKYCIV_DESIGN.ui.helpers.wasFileUploaded()` 							   		| Check if a file was uploaded.									                           			 | 
| `SKYCIV_DESIGN.ui.helpers.resetWasFileUploaded()` 						    | Reset the file upload flag.									                           			 | 
| `SKYCIV_DESIGN.ui.helpers.setReportHeading(heading)` 					   		| Override the report heading.									                           			 | 
| `SKYCIV_DESIGN.ui.helpers.setUIFinishedForOptimizer()` 					   	| Set UI finished state for optimizer.									                          	 | 
| `SKYCIV_DESIGN.ui.helpers.returnToGraphics(callback)` 					   	| Return to the graphics tab. `callback` is optional.									           	 | 
| `SKYCIV_DESIGN.ui.helpers.isInitalLoad()` 							  		| Check if this is the initial load.									                             | 

### Example getSectionTree and getMaterialTree

```js

// Full Material Tree
SKYCIV_DESIGN.ui.helpers.getMaterialTree({}, function(data) {
	console.log(data);
});

// Filtered Material Tree
SKYCIV_DESIGN.ui.helpers.getMaterialTree({ units: "Metric", material: "Aluminium" }, function(data) {
	console.log(data);
});

// Full Section Tree
SKYCIV_DESIGN.ui.helpers.getSectionTree({}, function(data) {
	console.log(data);
});

// Filtered Section Tree
SKYCIV_DESIGN.ui.helpers.getSectionTree({ country: "American", library: "ADM", shape: "Zees" }, function(data) {
    console.log(data);
});

```

## Tips

:::tip
You can set the `window.SKIP_UI_UPDATE` to `true` to avoid the ui.js script running in a loop when you update a dropdown in the ui.js. 
:::