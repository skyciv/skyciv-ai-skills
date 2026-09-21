---
id: quick-design-sections
title: SVG Section Dimensions
noIndex: true
---

The SVG Section Drawer has been developed to easily draw cross section dimensions for different geometries in SkyCiv Quick Design. 

## Supported Sections

- Hollow Rectangular
- Rectangular
- I-Beam
- Hollow Circular
- Circular
- Channel
- Double Channel
- Z Shapes
- T-Section
- Angle
- Hat Shape
- Hat Shape Angle
- Lipped Channel
- Lipped Double Channel
- Lipped Z

## Functions

### `drawRectangularTube`

Draws a rectangular tube.

| Parameter                | Type           | Description                                                      												|
|--------------------------|----------------|---------------------------------------------------------------------------------------------------------------|
| `color`                  | string         | The color of the tube.                                           												|
| `bInput`                 | number         | The section width.                                               												|
| `dInput`                 | number         | The section height.                                             												|
| `tFInput`                | number         | The flange thickness. Pass `false` to hide this dimension.         											|
| `tWInput`                | number         | The web thickness. Pass `false` to hide this dimension.                                                		|
| `width`                  | number         | The width of the drawing area.                                    											|
| `height`                 | number         | The height of the drawing area.                                   											|
| `units`                  | string         | The unit string for the dimensions.                               											|
| `axis`                   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).  |         
| `rotation_anticlockwise` | bool           | `true` rotates sections 90 degrees anticlockwise.                 											|
| `principal_axis` 		   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).  |


**Returns**: string - The SVG HTML representing the drawn rectangular tube.

### `drawRectangle`

Draws a rectangle.

| Parameter                | Type          | Description                                                    											  |
|--------------------------|---------------|--------------------------------------------------------------------------------------------------------------|
| `color`                  | string        | The color of the rectangle.                                    											  |
| `bInput`                 | number        | The section width.                                              											  |
| `dInput`                 | number        | The section height.                                             											  |
| `width`                  | number        | The width of the drawing area.                                 											  |
| `height`                 | number        | The height of the drawing area.                                  											  |
| `units`                  | string        | The unit string for the dimensions.                              											  |
| `axis`                   | bool or object| `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object). |         
| `rotation_anticlockwise` | bool          | `true` rotates sections 90 degrees anticlockwise.               											  |
| `principal_axis` 		   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).  |

**Returns**: string - The SVG HTML representing the drawn rectangle.

### `drawIBeam`

Draws an I beam.

| Parameter                | Type           | Description                                                    											  |
|--------------------------|----------------|-------------------------------------------------------------------------------------------------------------|
| `color`   			   | string		 	| The color of the beam.   							         												  |
| `bInput`  			   | number 		| The section width.        	 																			  |
| `dInput`  			   | number 		| The section height.       	 																			  |
| `tFInput` 			   | number 		| The flange thickness.     	 								 											  |
| `tWInput` 			   | number 		| The web thickness.            								 											  |
| `width`   			   | number 		| The width of the drawing area.                                											  |
| `height`  			   | number 		| The height of the drawing area.                              												  |
| `units`   			   | string 		| The unit string for the dimensions. 							 											  |
| `axis`    			   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|
| `rotation_anticlockwise` | bool 			| `true` rotates sections 90 degrees anticlockwise. 														  |
| `principal_axis` 		   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|

**Returns**: string - The SVG HTML representing the drawn I beam.

### `drawCircularTube`

Draws a circular tube.

| Parameter 	   | Type            | Description                                                    											    |
|------------------|-----------------|--------------------------------------------------------------------------------------------------------------|
| `color`   	   | string 		 | The color of the tube.    	 																			    |
| `dInput`  	   | number 		 | The section diameter.         																			    |
| `tInput`  	   | number 		 | The wall thickness. Pass `false` to hide this dimension.        	 											|
| `width`   	   | number 		 | The width of the drawing area. 																				|
| `height`  	   | number 		 | The height of the drawing area.																			    |
| `units`   	   | string 		 | The unit string for the dimensions. 																			|
| `axis`    	   | bool or object  | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object) 	|
| `principal_axis` | bool or object  | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object). |


**Returns**: string - The SVG HTML representing the drawn circular tube.

### `drawCircle`

Draws a circle.

| Parameter 	   | Type            | Description                                                    											    |
|------------------|-----------------|--------------------------------------------------------------------------------------------------------------|
| `color`   	   | string 		 | The color of the tube.    	 																			    |
| `dInput`  	   | number 		 | The section diameter.         																			    |
| `width`   	   | number 		 | The width of the drawing area. 																				|
| `height` 	       | number 		 | The height of the drawing area.																			    |
| `units`  	       | string 		 | The unit string for the dimensions. 																			|
| `axis`    	   | bool or object  | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object) 	|
| `principal_axis` | bool or object  | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object). |

**Returns**: string - The SVG HTML representing the drawn circular tube.

### `drawChannel`

Draws a channel.

| Parameter 			   | Type   		| Description              	  								 												  |
|--------------------------|----------------|-------------------------------------------------------------------------------------------------------------|
| `color`   			   | string 		| The color of the channel.  	  								 											  |
| `bInput`  			   | number		 	| The section width.        	  																			  |
| `dInput`  			   | number		 	| The section height.       	  								 											  |
| `tFInput` 			   | number		 	| The flange thickness.     	 								 											  |
| `tWInput` 			   | number			| The web thickness.            								 											  |
| `width`  				   | number			| The width of the drawing area.								 											  |
| `height` 				   | number		 	| The height of the drawing area.								 											  |
| `units`   			   | string 		| The unit string for the dimensions. 							 											  |
| `axis`    			   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|
| `rotation_anticlockwise` | bool 			| `true` rotates sections 90 degrees anticlockwise. 														  |
| `principal_axis` 		   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|

**Returns**: string - The SVG HTML representing the drawn channel.

### `drawDoubleChannel`

Draws a double channel.

| Parameter 			   | Type   		| Description              	  								 												  |
|--------------------------|----------------|-------------------------------------------------------------------------------------------------------------|
| `color`   			   | string 		| The color of the channel.  	  								 											  |
| `bInput`  			   | number		 	| The section width.        	  																			  |
| `dInput`  			   | number		 	| The section height.       	  								 											  |
| `tFInput` 			   | number		 	| The flange thickness.     	 								 											  |
| `tWInput` 			   | number			| The web thickness.            								 											  |
| `separation` 			   | number			| The separation thickness.            								 										  |
| `width`  				   | number			| The width of the drawing area.								 											  |
| `height` 				   | number		 	| The height of the drawing area.								 											  |
| `units`   			   | string 		| The unit string for the dimensions. 							 											  |
| `axis`    			   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|
| `rotation_anticlockwise` | bool 			| `true` rotates sections 90 degrees anticlockwise. 														  |
| `principal_axis` 		   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|

**Returns**: string - The SVG HTML representing the drawn double channel.

### `drawZ`

Draws a z shape

| Parameter 			   | Type   		| Description              	  								 												  |
|--------------------------|----------------|-------------------------------------------------------------------------------------------------------------|
| `color`   			   | string 		| The color of the channel.  	  								 											  |
| `bInput`  			   | number		 	| The section width.        	  																			  |
| `dInput`  			   | number		 	| The section height.       	  								 											  |
| `tInput` 			   	   | number		 	| The thickness.     	 								 											 		  |
| `width`  				   | number			| The width of the drawing area.								 											  |
| `height` 				   | number		 	| The height of the drawing area.								 											  |
| `units`   			   | string 		| The unit string for the dimensions. 							 											  |
| `axis`    			   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|
| `rotation_anticlockwise` | bool 			| `true` rotates sections 90 degrees anticlockwise. 														  |
| `principal_axis` 		   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|

**Returns**: string - The SVG HTML representing the drawn z shape.


### `drawTSection`

Draws a T Section.

| Parameter 			   | Type   		| Description              	  								 												  |
|--------------------------|----------------|-------------------------------------------------------------------------------------------------------------|
| `color`   			   | string 		| The color of the t section. 							    	 											  |
| `bInput`  			   | number		 	| The section width.        	 								 											  |
| `dInput`  			   | number		 	| The section height.       	 																			  |
| `tFInput`				   | number			| The flange thickness.     	 								 											  |
| `tWInput` 			   | number 		| The web thickness.            								 											  |
| `width`   			   | number		 	| The width of the drawing area.								 									          |
| `height`  			   | number		 	| The height of the drawing area.								 											  |
| `units`   			   | string 		| The unit string for the dimensions. 							 											  |
| `axis`    			   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object) |
| `rotation_anticlockwise` | bool 			| `true` rotates sections 90 degrees anticlockwise. 														  |
| `flip` 				   | bool 			| `true` flips the section. 																				  |
| `principal_axis` 		   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|

**Returns**: string - The SVG HTML representing the drawn T Section.

### `drawAngle`

Draws a angle Section.

| Parameter 			   | Type   		| Description              	  								 												  |
|--------------------------|----------------|-------------------------------------------------------------------------------------------------------------|
| `color`   			   | string 		| The color of the angle section. 							    	 										  |
| `bInput`  			   | number		 	| The section width.        	 								 											  |
| `dInput`  			   | number		 	| The section height.       	 																			  |
| `tFInput`				   | number			| The flange thickness.     	 								 											  |
| `tWInput` 			   | number 		| The web thickness.            								 											  |
| `width`   			   | number		 	| The width of the drawing area.								 									          |
| `height`  			   | number		 	| The height of the drawing area.								 											  |
| `units`   			   | string 		| The unit string for the dimensions. 							 											  |
| `axis`    			   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object) |
| `rotation_anticlockwise` | bool 			| `true` rotates sections 90 degrees anticlockwise. 														  |
| `flip` 				   | bool 			| `true` flips the section. 																				  |
| `principal_axis` 		   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|

**Returns**: string - The SVG HTML representing the drawn Angle Section.

### `drawHatSection`

Draws a hat section.

| Parameter 			   | Type   		| Description              	  								 												  |
|--------------------------|----------------|-------------------------------------------------------------------------------------------------------------|
| `color`  				   | string 		| The color of the hat section.																			  	  |
| `b1Input` 			   | string 		| The top flange width.  	 	 							     											  |
| `b2Input` 			   | string 		| The bottom flange width.  	 								 											  |
| `dInput` 				   | string 	    | The section height.  		 								 												  |
| `tFInput` 			   | number 		| The flange thickness.     	 																			  |
| `tWInput` 			   | number 		| The web thickness.            																			  |	
| `width`   			   | number		 	| The width of the drawing area.								 									          |
| `height`  			   | number		 	| The height of the drawing area.								 											  |
| `units`   			   | string 		| The unit string for the dimensions. 							 											  |
| `axis`    			   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object) |
| `flip` 				   | bool 			| `true` flips the section. 																				  |
| `principal_axis` 		   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|

**Returns**: string - The SVG HTML representing the drawn Hat Section.

### `drawHatAngleSection`

Draws a hat section angle.

| Parameter 			   | Type   		| Description              	  								 												  |
|--------------------------|----------------|-------------------------------------------------------------------------------------------------------------|
| `color`  				   | string 		| The color of the hat section.																			  	  |
| `b1Input` 			   | string 		| The top flange width.  	 	 							     											  |
| `b2Input` 			   | string 		| The bottom flange width.  	 								 											  |
| `dInput` 				   | string 	    | The section height.  		 								 												  |
| `tInput` 			       | number 		| The section thickness.     	 																			  |
| `lInput` 			       | number 		| The lip  thickness.     	 																		      	  |
| `lAInput` 			       | number 		| The lip  angle.     	 																			      |
| `hAInput` 			       | number 		| The hat  angle.     	 																		     	  |
| `width`   			   | number		 	| The width of the drawing area.								 									          |
| `height`  			   | number		 	| The height of the drawing area.								 											  |
| `units`   			   | string 		| The unit string for the dimensions. 							 											  |
| `axis`    			   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object) |
| `principal_axis` 		   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|

**Returns**: string - The SVG HTML representing the drawn Hat Section.

### `drawLippedChannel`

Draws a lipped channel.

Draws a channel.

| Parameter 			   | Type   		| Description              	  								 												  |
|--------------------------|----------------|-------------------------------------------------------------------------------------------------------------|
| `color`   			   | string 		| The color of the channel.  	  								 											  |
| `bInput`  			   | number		 	| The section width.        	  																			  |
| `dInput`  			   | number		 	| The section height.       	  								 											  |
| `tInput` 			   	   | number		 	| The flange and web thickness.     	 								 									  |
| `lInput` 			   	   | number			| The lip thickness.            								 											  |
| `width`  				   | number			| The width of the drawing area.								 											  |
| `height` 				   | number		 	| The height of the drawing area.								 											  |
| `units`   			   | string 		| The unit string for the dimensions. 							 											  |
| `axis`    			   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|
| `rotation_anticlockwise` | bool 			| `true` rotates sections 90 degrees anticlockwise. 														  |
| `principal_axis` 		   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|

**Returns**: string - The SVG HTML representing the drawn lipped channel.

### `drawLippedDoubleChannel`

Draws a lipped double channel.

| Parameter 			   | Type   		| Description              	  								 												  |
|--------------------------|----------------|-------------------------------------------------------------------------------------------------------------|
| `color`   			   | string 		| The color of the channel.  	  								 											  |
| `bInput`  			   | number		 	| The section width.        	  																			  |
| `dInput`  			   | number		 	| The section height.       	  								 											  |
| `tFInput`                | number         | The flange thickness.                                            										      |
| `tWInput`                | number         | The web thickness.                                               										      |
| `lInput` 			   	   | number		 	| The lip thickness.     	 								 											 	  |
| `separation` 			   | number			| The separation thickness.                                                                                   |
| `width`  				   | number			| The width of the drawing area.								 											  |
| `height` 				   | number		 	| The height of the drawing area.								 											  |
| `units`   			   | string 		| The unit string for the dimensions. 							 											  |
| `axis`    			   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|
| `principal_axis` 		   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|

**Returns**: string - The SVG HTML representing the drawn z shape.

### `drawLippedZ`

Draws a z shape.

| Parameter 			   | Type   		| Description              	  								 												  |
|--------------------------|----------------|-------------------------------------------------------------------------------------------------------------|
| `color`   			   | string 		| The color of the channel.  	  								 											  |
| `bInput`  			   | number		 	| The section width.        	  																			  |
| `dInput`  			   | number		 	| The section height.       	  								 											  |
| `tInput` 			   	   | number		 	| The thickness.     	 								 											 		  |
| `lInput` 			   	   | number		 	| The lip thickness.     	 								 											 	  |
| `width`  				   | number			| The width of the drawing area.								 											  |
| `height` 				   | number		 	| The height of the drawing area.								 											  |
| `units`   			   | string 		| The unit string for the dimensions. 							 											  |
| `axis`    			   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|
| `rotation_anticlockwise` | bool 			| `true` rotates sections 90 degrees anticlockwise. 														  |
| `principal_axis` 		   | bool or object | `false` is default for no axis, otherwise an [Axis Object](/api/v3/docs/quick-design-sections/#axis-object).|

**Returns**: string - The SVG HTML representing the drawn z shape.

## Axis Object 

The axis object can contain the following key-value pairs. 
The object can be set to `false` to exclude the axis.
An empty `{}` object can be used to include the default axis.

| Property                      | Default Value | Description                                           |
|-------------------------------|---------------|-------------------------------------------------------|
| vertical_label                | 'Z'           | The label for the vertical axis.                      |
| horizontal_label              | 'Y'           | The label for the horizontal axis.                    |
| vertical_color                | 'blue'        | The color for the vertical axis.                      |
| horizontal_color              | 'green'       | The color for the horizontal axis.                    |
| vertical_axis_label_color     | 'blue'        | The label color for the vertical axis.                |
| horizontal_axis_label_color   | 'green'       | The label color for the horizontal axis.              |
| axis_size                     | 'small'       | The size of the axis. `"small", "medium", "large"`.   |
| out_of_plane_label            | 'X'           | The label for the out of plane axis.                  |
| out_of_plane_label_color      | 'red'         | The label color for the out of plane axis.            |
| out_of_plane_color            | 'red'         | The color for the out of plane axis.                  |
| out_of_plane_dir              | 'cross'       | The direction of the axis. `"in", "out", "cross"`.    |
| show_out_of_plane_axis        | `false`       | Indicates if the out of plane axis should be shown.   |

## Example Code

In the ui.js file:

```js
var section_drawer = SectionDrawer();
svg_html = section_drawer.drawRectangularTube(
	'black', 
	100, 
	200,
	10, 
	12,  
	300,
	150,
	'mm',
	false
);
div_input = jQuery('#div_input')
div_input.html(svg_html)
```

In the calculate.js file:

```js
let sectionDrawer = SectionDrawer;
svg_html = sectionDrawer.drawRectangularTube(
	'black', 
	100, 
	200,
	10, 
	12,  
	300,
	150,
	'mm',
	false,
	false
);
ReportHelpers.print("", svg_html, "");
```

In the ui.js with axis object:

```js
var axis = false;
if (input.show_axis) {
	axis = {
		vertical_label: input.vertical_axis_label,
		horizontal_label: input.horizontal_axis_label,
		vertical_color: input.vertical_axis_color,
		horizontal_color: input.horizontal_axis_color,
	}
}

var section_drawer = SectionDrawer();
svg_html = section_drawer.drawRectangularTube(
	'black', 
	100, 
	200,
	10, 
	12,  
	300,
	150,
	'mm',
	axis,
	false
);

div_input = jQuery('#div_input')
div_input.html(svg_html)
```

## Sample Calculator

You can find a sample calculator to view all the options for SVG Section Dimensions [here](https://platform.skyciv.com/quick-design?uid=samples/section-drawer).