---
id: quick-design-svg-extended
title: SVG Extended
noIndex: true
---

# Overview

SVG Extended writes using a defined coordinate system by the user so the user does not need to deal with scaling.

SVG Extended includes a wrapper for all the previous functions included in SVG Creator that use the same inputs but in the updated coordinate system. SVG Extended also has a library of additional functions to help with engineering drawings (drawing loads, axes etc.)

An interactive version of SVG Extended can be found [here](https://platform.skyciv.com/quick-design?uid=samples/svg-creator).

Note: SVG Creator and SVG Extended work by adding to the same variable. Therefore, they can be used together in any order however we recommend if you are using SVG Extended the just stick to the  SVG Extended methods.

# SVG Extended

## Versions

SVG Extended defaults to version 1.
Some bugs have been fixed in version 2.

**Version 2 Fixes:**

- `addArrow` was scaling the line twice; now resolved in version 2.
- `addForce` was scaling the line twice; now resolved in version 2.

To use version 2, add the following line of code after `svg.init(...)`;

```js
svg.setVersion(2)
```

## Drawing Groups

SVG Extended functions are grouped into the different types:
- [Config](https://skyciv.com/api/v3/docs/quick-design-svg-extended#config) 
- [Shapes](https://skyciv.com/api/v3/docs/quick-design-svg-extended#shapes)
- [Lines](https://skyciv.com/api/v3/docs/quick-design-svg-extended#lines)
- [Dimension Lines](https://skyciv.com/api/v3/docs/quick-design-svg-extended#dimension-lines)
- [Text](https://skyciv.com/api/v3/docs/quick-design-svg-extended#text)
- [Loads](https://skyciv.com/api/v3/docs/quick-design-svg-extended#load)
- Supports (To do)
- [Other Engineering](https://skyciv.com/api/v3/docs/quick-design-svg-extended#other-engineering)
- [Concrete Drawings](https://skyciv.com/api/v3/docs/quick-design-svg-extended#concrete-drawings)
- [Concrete Helper Functions](https://skyciv.com/api/v3/docs/quick-design-svg-extended#concrete-helper-functions)
- [Helper Functions](https://skyciv.com/api/v3/docs/quick-design-svg-extended#helper-functions)

Nearly all methods (except those in the config and helper functions groups) take an <b>object</b> as input. Where optional parameters required for the SVG element are not provided defaults are used based on the relevant updateProps function.

## Sample Usage

To see sample usage of every function refer to the live QD demonstration page [here](https://platform.skyciv.com/quick-design?uid=samples/svg-creator).

```js

// load drawing package into svg alias
var svg = SVGExtended 

// InitialiZe to connect with "svg-div" id defined in html page
// note for usage in report we simply remove the div tag.
svg.initialize("svg-div")  

// set up conceptual working space from (0,0) to (100,100) 
// with a border of 0.05 (5%) of page size. 2.5% on each side.
const W = 100;
const H = 100;
svg.setBoundary({
    x1 : 0, 
    y1 : 0, 
    x2 : W, 
    y2 : H, 
    border : 0.05
}) 

// update shape properties for all
// every shape created after calling this function will now use these properties by default
svg.updateShapeProps({
	fill_color: "green",          // green fill color
	fill_opacity: 0.8,            // slightly transparent
	stroke: "black",              // black border line
	stroke_width: 1,              // border thickness of 1
	stroke_opacity : 1,           // border fully opaque
	stroke_dasharray : "5,5",     // dashed border pattern
	stroke_linejoin : "miter"     // How corner between lines are connected. See https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linejoin
})

// plotting rectangle
// plots a rectangle from the center of the div (50,50) to the bottom right of the div (100,100)
svg.addRect({
	x: W / 2, // left
	y: H / 2, // bottom
	rx : 0,  // corner radius 
	ry : 0,  // corner radius
	width : W /2,  
	height : H / 2, 
	fill_color : "red", // fill color overrides default of green
    // other options not specified take default shape props
    // would expect to see a black dashed border for example
})

// lets use circles to mark the edges & center of the SVG working area
// shape default properties will be used except stoke opacity set to 0 to remove border
svg.addCircle({ x: 0, y: 0 , radius : 1, stroke_opacity : 0})
svg.addCircle({ x: 0, y: H , radius : 1, stroke_opacity : 0})
svg.addCircle({ x: W, y: 0 , radius : 1, stroke_opacity : 0})
svg.addCircle({ x: W, y: H , radius : 1, stroke_opacity : 0})
svg.addCircle({ x: W / 2, y: H / 2 , radius : 1, stroke_opacity : 0})

// update the graph in the div
svg.updateGraph();
```

The output from the above code is shown in the image below.

<img src="https://skyciv.com/wp-content/uploads/2024/11/svgdemo_screenshot.png" width="500" />


## Sample Usage for Report

For printing to a report we can copy all of our code to our calculate file.

Running this code should give a satisfactory output.

You can optionally change the width and height of the graph in the initialize call however the defaults should give a satisfactory result.

```js

var svg = SVGExtended;
svg.initialize(width = 500, height = 500)  // or svg.initialize("div") or svg.initialize()

// code as previous
// ...
// ...


```


## Config

| Function           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `initialize`       | Initializes the SVG canvas with specified dimensions or div ID.             |
| `setBoundary`      | Defines a conceptual working area for the SVG.                              |
| `updateGraph`      | Updates the SVG graph in the specified div or returns the SVG HTML.         |
| `addMarker`        | Adds a custom marker definition to the SVG.                                 |

### initialize

Initializes the SVG canvas with specified dimensions and alignment settings.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `divID`            | The div Id where the SVG is to be drawn. (Use default of `null` when generating for report ) |
| `width`            | The pixel width of the SVG canvas used when divId not provided. (Default 500)            |
| `height`           | The pixel height of the SVG canvas used when divId not provided. (Default 500)   |

### setBoundary

Defines a conceptual working area for the SVG. Takes a single object as input.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x1`               | The left x-coordinate of the boundary. Defaults to 0.                       |
| `y1`               | The bottom y-coordinate of the boundary. Defaults to 0.                     |
| `x2`               | The right x-coordinate of the boundary. Defaults to 1000.                   |
| `y2`               | The top y-coordinate of the boundary. Defaults to 1000.                     |
| `footer_height`    | The % of the div height to be allocated to the footer (given in range 0-1). Note that to access this space  would need to use coordinates below y1 , can use the SVGExtended.y0 property to get the extreme bottom position of the footer (readonly).   |
| `border`           | The border as a fraction of the total size (0-1). Defaults to 0.05.         |

### updateGraph

Updates the SVG graph in the specified div or returns the SVG HTML.

Takes no arguments.

### addMarker

Adds a custom marker definition to the SVG.

NOTE: Is just doing the same thing as the SVG Creator method. Using the SVG Creator method would achieve the same thing.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `marker_id`        | A unique identifier for the marker. This ID is used to reference the marker in SVG elements. |
| `marker_width`     | Sets the width of the marker.                                               |
| `marker_height`    | Sets the height of the marker.                                              |
| `refX`             | Defines the x-coordinate for the reference point of the marker.             |
| `refY`             | Defines the y-coordinate for the reference point of the marker.             |
| `marker_dims`      | Contains an array of coordinate pairs defining the polygonal shape of the marker. |
| `fill_color`       | The fill color of the marker. Defaults to `"black"`.                        |

## Shapes

Note that shapeProps in the `updateShapeProps(shapeProps)` method are also available in all shapes (some exceptions, like that for a circle linejoin does not matter). Shape props assigned within shape functions override the defaults.


| Method                        | Description                                                                                          																		  |
|-------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `updateShapeProps(shapeProps)`       | Update the default properties for a shape.										  |
| `addRect(rect_obj)`                      | Adds a [rectangle](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/rect) to the SVG.  								 								  |
| `addCircle(circle_obj)`                    | Adds a [circle](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/circle) to the SVG.  									 								  |
| `addPolygon(polygon_obj)`                   | Adds a [polygon](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/polygon) to the SVG.  									 								  |
| `addSegment(segment_obj)`                   | Adds a segment to the SVG.			 								  |
| `addSector(sector_obj)`                    | Adds a sector to the SVG.								 								  |

### updateShapeProps

Note that all shape properties are defaulted to the current value if not explicitly provided in the updateShapeProps call. Initialized values are mentioned in the table below (not to be confused with the default value which is the current assigned value.)


For example the fill color is initialized to grey. If an updateShapeProps call updates the default fill_color to yellow then the default becomes yellow. On a second call of the updateShapeProps if the fill_color argument is omitted the default remains as yellow and does not get reset back to grey. 


| Property                 | Description                                                                                                 |
|--------------------------|-------------------------------------------------------------------------------------------------------------|
| `fill_color`      	   | The fill color of the shape. (Initialized as "grey" )                		 |
| `fill_opacity`      	   | The opacity of the fill color. Accepts values from 0 (completely transparent) to 1 (completely opaque). (Initialized to 1.)	 |
| `stroke`  			   | The stroke (border) color of the rectangle. (Initialized to `"black"`).                                                     		 |
| `stroke_width`      	   | The width of the stroke. (Initialized to 0.5).                                                                		 	 |
| `stroke_opacity`         | The opacity of the stroke. Accepts values from 0 to 1. (Initialized to 1).                                  										 |
| `stroke_dasharray`  	  | A string specifying the pattern of dashes and gaps for the stroke. For example, `"5,5"` creates a dashed line with 5 units of dash followed by 5 units of gap. (Initialized to empty string which is a solid line)     									    |
| `stroke_linejoin`        | The style of the corners where lines meet. Options include `"miter"`, `"round"`, and `"bevel"`. (Initialized to "miter"`).											 |

### addRect

Add a rectangle to the SVG.

WARNING: Semantics is different from SVG Creator which references top left of rectangle. This rect obj references bottom left.

WARNING: Transform string does not map between the coordinate systems since it is directly passed to the SVG. For something like rotate the approach would be to map to the coordinate system using the helper functions transformX() & transformY() for example:

```transform: `rotate(${angle * -1} ${this.transformX(x)} ${this.transformY(y)})```

| Property                 | Description                                                                                                 |
|--------------------------|-------------------------------------------------------------------------------------------------------------|
| `x`  			   		   | Specifies the x-coordinate of the bottom-left corner of the rectangle.                                      |
| `y`      	   			   | Specifies the y-coordinate of the bottom-left corner of the rectangle.                                      |
| `rx`  			   	   | Rounding of rectangle corner on x side.							                                 		 |
| `ry`      	   		   | Rounding of rectangle corner on y side.				     			                                     |
| `width`      	   		   | Sets the width of the rectangle.                                      										 |
| `height`  			   | Sets the height of the rectangle.								    									     |
| `transform`     		   | Transform string. See [SVG docs](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform) 	 |


### addCircle

Add a circle to the SVG.

WARNING: The old SVG Creator method uses center_x and center_y whereas addCircle uses x and y to be consistent with notation used in other functions.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x`                | The x-coordinate of the center of the circle.                               |
| `y`                | The y-coordinate of the center of the circle.                               |
| `radius`           | The radius of the circle.                                                   |
| `transform`        | A transformation string applied to the circle. Defaults to an empty string. |

### addPolygon

Add a polygon to the SVG.

WARNING: Semantics slightly different to SVG Created since coordinates are taken as a list of lists rather than a string. 

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `coords`           | A list of (minimum 3) [x , y] coordinate pairs                              |
| `transform`        | Transform string. See [SVG docs](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform) 	 |

### addSegment

Add a segment to the SVG.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x`                | The x-coordinate of the center of the segment.                              |
| `y`                | The y-coordinate of the center of the segment.                              |
| `radius`           | The radius of the segment. (Default 6)                                      |
| `start_angle`      | The starting angle of the segment. (Default 30)                             |
| `end_angle`        | The ending angle of the segment.   (Default 150)                            |

### addSector

Add a Sector to the SVG.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x`                | The x-coordinate of the center of the sector.                               |
| `y`                | The y-coordinate of the center of the sector.                               |
| `radius`           | The radius of the segment. (Default 6)                                      |
| `start_angle`      | The starting angle of the segment. (Default 30)                             |
| `end_angle`        | The ending angle of the segment.   (Default 150)                            |




## Lines

Note that lineProps in the `updateLineProps(lineProps)` method are also available in all lines. Line props assigned within line functions override the defaults.

| Method                        | Description                                                                 |
|-------------------------------|-----------------------------------------------------------------------------|
| `updateLineProps(lineProps)`  | Update the default properties for lines.                                    |
| `addPath(path_obj)`           | Adds a [path](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/path) to the SVG. |
| `addLine(line_obj)`           | Adds a [line](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/line) to the SVG. |
| `addPolyLine(obj)`           | Adds multiple [line](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/line) objects to the SVG. |
| `addArc(arc_obj)`             | Adds an arc to the SVG.                                                     |
| `addBreakline(breakline_obj)` | Adds a breakline to the SVG.                                                     |
| `addDoubleBreakLine(obj)`     | Adds two breaklines with intermediate filled space to the SVG. |
| `addArrow(arrow_obj)`         | Adds an arrow to the SVG. |

### updateLineProps

Updates the default properties for line functions.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `stroke`           | The stroke (border) color of the line. Defaults to `"black"`.               |
| `stroke_width`     | The width of the stroke (border) around the line. Defaults to 1.            |
| `stroke_opacity`   | The opacity of the stroke. Defaults to 1.                                   |
| `stroke_dasharray` | The pattern of dashes and gaps for the stroke. Defaults to an empty string. |
| `stroke_linejoin`  | The style of the corners where the line's segments meet. Defaults to `"miter"`. |
| `marker_end_def`   | The marker definition for the end of the line.                              |
| `marker_start_def` | The marker definition for the start of the line.                            |


### addPath

Adds a [path](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/path) to the SVG.


| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `coords`           | A list of (minimum 2) [x , y] coordinate pairs                              |
| `transform`        | Transform string. See [SVG docs](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform) 	 |



### addLine

Adds a [line](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/line) to the SVG.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x1`               | The x-coordinate of the start of the line.                                  |
| `y1`               | The y-coordinate of the start of the line.                                  |
| `x2`               | The x-coordinate of the end of the line.                                    |
| `y2`               | The y-coordinate of the end of the line.                                    |
| `transform`        | A transformation string applied to the line. Defaults to an empty string.   |


### addPolyLine

Adds multiple [line](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/line) to the SVG.


| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `coords`           | A list of (minimum 2) [x , y] coordinate pairs. Can also be a list of {x,y}    objects                      |
| `transform`        | Transform string. See [SVG docs](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform) 	 |



### addArc

Adds an arc to the SVG.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x`                | The x-coordinate of the center of the sector.                               |
| `y`                | The y-coordinate of the center of the sector.                               |
| `radius`           | The radius of the segment. (Default 6)                                      |
| `start_angle`      | The starting angle of the segment. (Default 30)                             |
| `end_angle`        | The ending angle of the segment.   (Default 150)                            |


### addBreakLine

Add a breakline to the SVG. 

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x1`               | The x-coordinate of the start of the break line.                            |
| `y1`               | The y-coordinate of the start of the break line.                            |
| `x2`               | The x-coordinate of the end of the break line.                              |
| `y2`               | The y-coordinate of the end of the break line.                              |
| `size`             | The size of the break in the line. Defaults to 2 (scaled to 100).           |
| `position`         | The position of the break in the line as a fraction of the line length. Defaults to 0.5. |

### addDoubleBreakLine

Add a breakline to the SVG. 

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x1`               | The x-coordinate of the start of the break line.                            |
| `y1`               | The y-coordinate of the start of the break line.                            |
| `x2`               | The x-coordinate of the end of the break line.                              |
| `y2`               | The y-coordinate of the end of the break line.                              |
| `size`             | The size of the break in the line. Defaults to 2 (scaled to 100).           |
| `position`         | The position of the break in the line as a fraction of the line length. Defaults to 0.5. |
| `width`            | The width of the break area. Defaults to 5 (scaled to 100).      |
| `fill_color`            | The fill color for between the break lines. Defaults to `"white"`.     |
| `fill_opacity`          | The fill opacity for between the break lines. Defaults to 1.           |


### addArrow

Adds an arrow to the SVG.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x`                | The x-coordinate of the head of the arrow.                                 |
| `y`                | The y-coordinate of the head of the arrow.                                 |
| `angle`            | The angle of the arrow in degrees. Defaults to 90.                          |
| `fill_arrow_head`  | Whether to fill the arrowhead. Defaults to true.                            |
| `reverse`   | If true then reverse the direction of the arrow. Default false.   |
| `arrow_length`     | The length of the arrow. Defaults to the current lineProps value.           |
| `arrow_offset`     | The offset of the arrow from the location it points at. Defaults to the current lineProps value. |
| `arrow_size`       | The size of the arrowhead. Defaults to the current lineProps value.         |
| `stroke`           | The stroke color of the arrow. Defaults to the current lineProps value.     |
| `stroke_width`     | The stroke width of the arrow. Defaults to the current lineProps value.     |
| `stroke_dasharray` | The stroke dash array of the arrow. Defaults to the current lineProps value.|
| `stroke_opacity`   | The stroke opacity of the arrow. Defaults to the current lineProps value.   |



## Dimension Lines

| Function           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `dimLineDrawer`    | Draws a dimension line between two points.                                  |
| `dimAngleDrawer`   | Draws a dimension angle between two lines.                                  |
| `updateDimLineProps` | Updates the default properties for dimension lines.                       |

### updateDimLineProps

Updates the default properties for dimension lines.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `stroke`           | The stroke color of the dimension line. Defaults to `"black"`.              |
| `stroke_width`     | The stroke width of the dimension line. Defaults to 1.                      |
| `stroke_opacity`   | The stroke opacity of the dimension line. Defaults to 1.                    |
| `stroke_dasharray` | The stroke dash array of the dimension line. Defaults to an empty string.   |
| `stroke_linejoin`  | The stroke line join of the dimension line. Defaults to `"miter"`.          |
| `arrow_size`       | The size of the arrowheads. Defaults to 1.                                  |
| `decimal_places`   | The number of decimal places for the dimension text. Defaults to 1.         |
| `units`            | The units for the dimension text. Defaults to `"mm"`.                       |
| `vertical_padding` | The vertical padding of the dimension text. Defaults to 0.                  |
| `font_size`        | The font size of the dimension text. Defaults to `"12px"`.                  |
| `font_weight`      | The font weight of the dimension text. Defaults to `"normal"`.              |
| `font_color`       | The font color of the dimension text. Defaults to `"black"`.                |
| `text_decoration`  | The text decoration of the dimension text. Defaults to an empty string.     |
| `text_opacity`     | The text opacity of the dimension text. Defaults to 1.                      |

### dimLineDrawer

Draws a dimension line between two points.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x1`               | The x-coordinate of the start point of the dimension line.                  |
| `y1`               | The y-coordinate of the start point of the dimension line.                  |
| `x2`               | The x-coordinate of the end point of the dimension line.                    |
| `y2`               | The y-coordinate of the end point of the dimension line.                    |
| `pos`              | The position of the dimension text. Options are `"start"`, `"middle"`, and `"end"`. Defaults to `"start"`. |
| `text`             | The text to display on the dimension line. Defaults to an empty string.     |
| `line_padding`     | Offset for dimension line. Defaults to -2. |
| `extended_edges`   | If true then shows a line between x1,y1 and the line_padding offset position. Defaults to true. |

### dimAngleDrawer

Draws a dimension angle between two lines.

NOTE: Arrow size is limited so that it does not exceed 1/3 of the chord length of the arc being drawn.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `xc`               | The x-coordinate of the center point of the angle.                          |
| `yc`               | The y-coordinate of the center point of the angle.                          |
| `x1`               | The x-coordinate of the start point of the first line.                      |
| `y1`               | The y-coordinate of the start point of the first line.                      |
| `x2`               | The x-coordinate of the start point of the second line.                     |
| `y2`               | The y-coordinate of the start point of the second line.                     |
| `radius`           | The radius of the arc representing the angle.                               |
| `acute`            | Whether the angle is acute. Defaults to true.                               |
| `text`             | The text to display on the dimension angle. If empty string then value is automatically calculated   |
| `pos`              | The position of the dimension text scaled from 0-1. Position 0 is the anti-clockwise starting point. If pos is 0 or 1 exactly then the text is displayed outside the arc. |
| `text_offset`     | Padding of the dimension text. Defaults to 1.                  |


## Text

Note that textProps in the `updateTextProps(textProps)` method are also available in all text methods. Text props assigned within line functions override the defaults.

Note that text is made to scale relative to the size of the frame so a consistent image is produced regardless of the size of the SVG / div.

| Function           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `updateTextProps(textProps)`  | Updates the default properties for text.                                    |
| `addText(text_obj)`          | Adds text to the SVG.                                                       |
| `addTable(table_obj)`          | Adds a Table to the SVG.                                                       |
| `getTableDimensions(table_obj)`        | Get dimensions of table in form of row_heights and column heights in 0-100 scale.                                                       |


### updateTextProps

Updates the default properties for text.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `font_family`      | The [font family](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/font-family) for text. (Initialized to 'Helvetica, Segoe UI Emoji')                                        |
| `font_size`        | The [font size](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/font-size) for text.   (Initialized to "12px")                                              |
| `font_weight`      | The [font weight](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/font-weight) for text (normal , bold , bolder , lighter , number).  (Initialized to "normal")                                                 |
| `font_color`       | The font color for text. (Initialized to "black")                                                |
| `text_decoration`  | The [text decoration](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/text-decoration) , used for things like underline and strike-through.     (Initialized to "")                                                |
| `text_anchor`      | The [text anchor](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/text-anchor), horizontal alignment of text (start | middle | end).    (Initialized to "start")                                                      |
| `dominant_baseline`| The [dominant baseline](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/dominant-baseline) (auto , text-bottom , alphabetic , ideographic , middle , central , mathematical , hanging , text-top) (Initialized to "middle").                                                      |
| `text_opacity`     | The opacity of the text. Accepts values from 0 to 1.(Initialized to 1).                                                           |
| `font_style`       | The [font style](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/font-style) for text (normal, italic, oblique). (Initialized to "normal") |

### addText

Adds text to the SVG.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x`                | The x-coordinate of the text.                                               |
| `y`                | The y-coordinate of the text.                                               |
| `text_value`       | The text content. Defaults to an empty string.                              |
| `transform`        | The transformation to apply to the text. Defaults to an empty string.       |
| `angle`            | If != 0 replaces the transformation string with a string that rotates the text about x and y (Default value is 0). Note that the text rotation may not appear as expected depending on the dominant_baseline and the text_anchor. To rotate about the center of the text these would both be required to be set to middle. |
| `parse_sub`        | If true automatically replace `sub` tags with HTML that displays as subscript. If false no substitution will take place for `sub` tags. Defaults to true.   |
| `parse_sup`        | If true automatically replace `sup` tags with HTML that displays as superscript. If false no substitution will take place for `sup` tags. Defaults to true.   |
| `br_line_spacing`  | Spacing to use between text lines (as multiple of text size) where `br` tags are used. Default 1.25. ( Less than 1 would have text clashing. )  |


### addTable

Adds a table to the SVG. br html tags can be used to go to a newline. sub and sup html elements are also available for use. Table cell height and width is automatically set depending on the text content. In the event of irregular data the number of columns is controlled based on the number of headings.

Text anchor and dominant baseline can be used to control the text position in the cell. The dominant baseline is not truly the dominant baseline feature from svg and as such the only available options are top, middle and bottom.

| Property                | Description                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| `x`                     | The x-coordinate of the top-left corner of the table.                       |
| `y`                     | The y-coordinate of the top-left corner of the table.                       |
| `heading`               | An array of strings representing the table headings.                        |
| `data`                  | An array of arrays representing the rows of the table. Each inner array represents a row, and each element in the inner array represents a cell. |
| `stroke_opacity`        | The stroke opacity for the table borders. Defaults to 1.                    |
| `stroke`                | The stroke color for the table borders. Defaults to `"black"`.              |
| `stroke_width`          | The stroke width for the table borders. Defaults to 1.                      |
| `stroke_dasharray`      | The stroke dash array for the table borders. Defaults to an empty string.   |
| `fill_color`            | The fill color for the table cells. Defaults to `"white"`.                  |
| `fill_opacity`          | The fill opacity for the table cells. Defaults to 0.9.                      |
| `font_family`           | The font family for the table text. Defaults to the current textProps value.|
| `font_size`             | The font size for the table text. Defaults to the current textProps value.  |
| `font_weight`           | The font weight for the table text. Defaults to the current textProps value.|
| `font_color`            | The font color for the table text. Defaults to the current textProps value. |
| `text_decoration`       | The text decoration for the table text. Defaults to the current textProps value. |
| `text_opacity`          | The opacity of the table text. Defaults to the current textProps value.     |
| `heading_fill_color`    | The fill color for the table headings. Defaults to `"lightgrey"`.           |
| `heading_fill_opacity`  | The fill opacity for the table headings. Defaults to 0.9.                   |
| `heading_font_family`   | The font family for the table headings. Defaults to the current textProps value. |
| `heading_font_size`     | The font size for the table headings. Defaults to 1.2 times the current textProps value. |
| `heading_font_weight`   | The font weight for the table headings. Defaults to `"bold"`.               |
| `heading_font_color`    | The font color for the table headings. Defaults to the current textProps value. |
| `heading_text_decoration` | The text decoration for the table headings. Defaults to the current textProps value. |
| `heading_text_opacity`  | The opacity of the table headings. Defaults to the current textProps value. |
| `text_anchor`           | The text anchor for the table text. Defaults to `"middle"`.                  |
| `dominant_baseline`     | The dominant baseline for the table text. Defaults to `"middle"`.           |


### getTableDimensions

Gets the table dimensions by returning a 2 item array that contains a row heights array and a column heights array that are both defined in the 0 - 100 scale. The main use case is to be able to determine the table height prior to defining the boundaries via the setBoundary function to allow the boundary dimensions to appropriately have additional space for a table footer. 

An example of a typical use case is shown below.

```js

var svg = SVGExtended
svg.initialize("svg-div")

var [row_heights, col_widths] = svg.getTableDimensions({
	heading : ["A", "B", "Cat", "Dog"],
	data : input.table_generic_data.map(item => [item.x1, item.y1, item.z1]),
    font_size : 12,
    heading_font_size : 14
})

var table_height = row_heights.reduce((a, b) => a + b, 0)

svg.setBoundary({
	x1: input.canvas_x1,
	y1: input.canvas_y1,
	x2: input.canvas_x2,
	y2: input.canvas_y2,
	border: input.border,
	footer_table_height : input.table_as_footer == "yes" ? table_height/100 : 0,
})

```

Text anchor and dominant baseline can be used to control the text position in the cell. The dominant baseline is not truly the dominant baseline feature from svg and as such the only available options are top, middle and bottom.

| Property                | Description                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| `heading`               | An array of strings representing the table headings.                        |
| `data`                  | An array of arrays representing the rows of the table. Each inner array represents a 
| `font_size`             | The font size for the table text. Defaults to the current textProps value.  |
| `heading_font_size`     | The font size for the table headings. Defaults to 1.2 times the current textProps 

## Load

| Function           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `updateLoadProps`  | Updates the default properties for loads.                                   |
| `addForce`         | Adds a force arrow to the SVG.                                              |
| `addMoment`        | Adds a moment arrow to the SVG.                                             |
| `addUDL`           | Adds a uniformly distributed load (UDL) to the SVG.                         |
| `addTrapezoidal`   | Adds a trapezoidal line load to the SVG.                      |
| `addLoadGroup`     | Adds a group of loads (forces and moments) to the SVG.                      |


### updateLoadProps

Updates the default properties for loads.

Note that text_offset_x and text_offset_y are always with respect the SVG arrangement and do not consider the angle of the load. The angle of the load also affects the dominant_baseline and the text_anchor for positioning so that as a load rotates with 0 text offset it continues to appear in a reasonable position.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `arrow_size`       | The size of the arrowhead (On scale of 0-100 where 100 is SVG size). (Initialized to 2.5)                           |
| `arrow_length`     | The length of the arrow (On scale of 0-100 where 100 is SVG size). (Initialized to 12)                           |
| `arrow_offset`     | The stroke color for loads. (On scale of 0-100 where 100 is SVG size). (Initialized to 1.5)                           |
| `number_arrows`    | The number of arrows in the UDL. Defaults to 5. If less than 2 no arrows are shown. If arrow_spacing property is set then this value is ignored and the spacing is used to determine the number of arrows. Initialized to 5.  |
| `arrow_spacing`    | The spacing of arrows in the UDL. If set to 0 then number arrows is used. Initialized to 0. Spacing of arrow defined based on % of canvas size ie spacing of 5 would have 20 arrows if the UDL extended the full width of the canvas. |
| `opacity`          | The opacity for the load arrow and arrowhead. (Initialized to 1)                           |
| `stroke`           | The stroke color for loads. (Initialized to "red")                           |
| `stroke_width`     | The stroke width for loads. (Initialized to 3)                                       |
| `stroke_dasharray` | The stroke dash array for loads.   (Initialized to "")          |
| `font_size`        | The font size for load text.   (Initialized to 12)                         |
| `font_weight`      | The font weight for load text.   (Initialized to "normal")                             |
| `font_color`       | The font color for load text.    (Initialized to "black")                       |
| `text_decoration`  | The text decoration for load text.     (Initialized to "")                 |
| `text_opacity`     | The text opacity for load text.      (Initialized to 1)                    |
| `text_offset_x`    | Text offset in x direction for addForce and addMoment methods. Initialized to 0.       |
| `text_offset_y`    | Text offset in y direction for addForce and addMoment methods. Initialized to 0.       |
| `units_force`      | The units for the load text to display. Initialized to "kN".       |
| `units_moment`     | The units for the load text to display. Initialized to "kN-m".       |
| `units_UDL`        | The units for the load text to display. Initialized to "kN/m".       |


### addForce

Adds a force arrow to the SVG.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x`                | The x-coordinate of the point where the arrow is directed.                  |
| `y`                | The y-coordinate of the point where the arrow is directed.                  |
| `value`            | An optional label or value to display alongside the arrow. Defaults to an empty string. |
| `angle`            | The angle of the arrow in degrees (0 points left, 90 points down, etc.). Defaults to 90. |
| `units`            | The units for the load text to display. Defaulted to loadProps `units_force` value. Initialized to "kN".       |
| `text_offset_x`    | Text offset in x direction. Initialized to 0. Default based on loadProps.       |
| `text_offset_y`    | Text offset in y direction. Initialized to 0. Default based on loadProps.      |
| `text_anchor`       | The text anchor position (if null then automatically set). Default null |
| `dominant_baseline` | The text [dominant baseline](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/dominant-baseline), position (if null then automatically set). Default null. |
| `rotate_text`    |  Rotation of text where 0 is horizontal. Default is 0.   |
| `text_at_tail`   |  If true the text is placed next to the tail of the arrow. Otherwise it is next to the head of the arrow. Default is true |
| `reverse_arrow` |  If true reverses the arrow so that the tail is associated with the x,y coordinates and the arrow head is where the tail would otherwise be. Default false. |

### addMoment

Adds a moment arrow to the SVG.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x`                | The x-coordinate of the center of the moment.                               |
| `y`                | The y-coordinate of the center of the moment.                               |
| `value`            | An optional label or value to display alongside the moment. Defaults to an empty string. |
| `angle`            | The angle of the moment in degrees (mainly used for coupling with shear force arrow and matches the addForce direction notation). 90 degrees is the default and pairs with a vertical addForce arrow which also would have an angle of 90 degrees.                     |
| `start_angle`      | The starting angle of the moment for drawing arc. Defaults to 35.                           |
| `end_angle`        | The ending angle of the moment for drawing arc. Defaults to 150.                            |
| `clockwise`        | Whether the moment is clockwise to determine which side to place the arrowhead and which side to place the text. Defaults to false.                         |
| `radius`           | The radius of the moment (scale of 0 - 100 of page size). Defaults to 0.6 * loadProps arrow_length .                                     |
| `units`            | The units for the load text to display. Defaulted to loadProps `units_moment` value. Initialized to "kN-m".       |
| `text_offset_x`    | Text offset in x direction. Initialized to 0. Default based on loadProps.       |
| `text_offset_y`    | Text offset in y direction. Initialized to 0. Default based on loadProps.      |
| `text_anchor`       | The text anchor position (if null then automatically set). Default null |
| `dominant_baseline` | The text [dominant baseline](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/dominant-baseline), position (if null then automatically set). Default null. |
| `rotate_text`    |  Rotation of text where 0 is horizontal. Default is null which matches text angle to angle of moment.   |
| `text_at_tail`   |  If true the text is placed next to the tail of the arrow. Otherwise it is next to the head of the arrow. Default is true |

### addUDL

Adds a uniformly distributed load (UDL) to the SVG.

If text is inside the UDL try flipping the coordinates for point 1 and point 2 or setting the text offset to a negative value.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x1`               | The x-coordinate of the start of the UDL.                                   |
| `y1`               | The y-coordinate of the start of the UDL.                                   |
| `x2`               | The x-coordinate of the end of the UDL.                                     |
| `y2`               | The y-coordinate of the end of the UDL.                                     |
| `value`            | An optional label or value to display alongside the UDL. Defaults to an empty string. |
| `angle`            | The angle of the ARROWS in degrees. Arrows are not by default drawn perpendicular to the line defined by (x1,y1) to (x2,y2). Defaults to 90.                            |
| `text_offset`     | Vertical text padding. Defaults to 1. |
| `fill_color`     | Shading fill color to place behind arrows. Defaults to current loadProps value for Stroke.|
| `fill_opacity`     | Shading opacity for fill behind UDL arrows. Defaults to 0.2.|
| `units`            | The units for the load text to display. Defaulted to loadProps `units_UDL` value. Initialized to "kN/m".       |
| `rotate_text`      | The rotation of the text. Defaults to null (automatically set).                                 |
| `dominant_baseline`| The dominant baseline of the text. Defaults to null (automatically set).                        |
| `text_anchor`      | The text anchor of the text. Defaults to null (automatically set).                               |


### addTrapezoidal

Adds a trapezoidal load representation to the SVG.

Add trapezoidal is different to UDL since it allows a different force on each side. You can even use a negative force in combination with a positive force.

Value left and value right must be numeric since the value is scaled. Units are appended to the end of the text based on the units parameter.

Warning: Text offset may change direction when rotating object around. Check that text appears correct for all possible combinations that are correct with your calculator. 


| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x1`               | The x-coordinate of the start of the trapezoidal load.                      |
| `y1`               | The y-coordinate of the start of the trapezoidal load.                      |
| `x2`               | The x-coordinate of the end of the trapezoidal load.                        |
| `y2`               | The y-coordinate of the end of the trapezoidal load.                        |
| `value_left`       | The load value at the start (left) of the trapezoidal load, must be numeric as is used for scaling. Defaults to 10. |
| `value_right`      | The load value at the end (right) of the trapezoidal load, must be numeric as is used for scaling. Defaults to 10.  |
| `hide_left_text`   | Whether to hide the text at the start (left) of the trapezoidal load. Defaults to false. |
| `hide_right_text`  | Whether to hide the text at the end (right) of the trapezoidal load. Defaults to false. |
| `angle`            | The angle of the trapezoidal load arrows in degrees. Defaults to 90.               |
| `snap_text`        | Whether to snap the text to the nearest 90 degrees or display perpendicular to load line. Defaults to true.      |
| `text_offset`     | Vertical text padding. Defaults to 1. |
| `fill_color`     | Shading fill color to place behind arrows. Defaults to current loadProps value for Stroke.|
| `fill_opacity`     | Shading opacity for fill behind trapezoidal arrows. Defaults to 0.2.|
| `arrow_length`     | The maximum length of the arrows in the trapezoidal load. (Smaller value side scaled down). Defaults to the current loadProps value. (Length is on a scale of 0-100 where 100 is SVG size). (Initialized to 12)   |
| `units`            | The units for the load text to display. Defaulted to loadProps `units_UDL` value. Initialized to "kN/m".       |
| `rotate_text`      | The rotation of the text. Defaults to null (automatically set).                                 |
| `dominant_baseline`| The dominant baseline of the text. Defaults to null (automatically set).                        |
| `text_anchor`      | The text anchor of the text. Defaults to null (automatically set).                               |
|`absmax_text`   |       Boolean used to control if the values will be shown as an absolute value. Defaults to false which allows for negative sign on values                |

### addLoadGroup

Adds a group of loads (forces and moments) to the SVG.

If a value is an empty string then the arrow for that force direction is not shown. If want to show the arrow but no label can use a space " " or can set the text opacity to 0.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x`                | The x-coordinate of the center of the load group.                           |
| `y`                | The y-coordinate of the center of the load group.                           |
| `Fx`               | The force in the x-direction. Defaults to an empty string.                  |
| `Fy`               | The force in the y-direction. Defaults to an empty string.                  |
| `M`                | The moment. Defaults to an empty string.                                    |
| `left`             | Whether the force in the x-direction is to the left. Defaults to true.      |
| `down`             | Whether the force in the y-direction is downwards. Defaults to true.        |
| `clockwise`        | Whether the moment is clockwise. Defaults to false.                         |
|  `Fx_reverse`      |  Reverse the Fx arrow so that the tail is at the x,y coordinate. Arrow direction still maintained based on left flag. Default false.       |
|  `Fy_reverse`      |  Reverse the Fy arrow so that the tail is at the x,y coordinate. Arrow direction still maintained based on down flag.Also affects the moment location since it is coupled with the Fy arrow position. Default false        |                
| `angle`            | The angle of the load group in degrees where 0 is a standard arrangement with a vertical load, horizontal load and moment drawn at 90 degrees. Defaults to 0.                      |
| `opacity`          | The opacity of the load group. Defaults to the current loadProps value.     |
| `units_force_x`            | The units for the load text to display. Defaulted to loadProps `units_force` value. Initialized to "kN".       |
| `units_force_y`            | The units for the load text to display. Defaulted to loadProps `units_force` value. Initialized to "kN".       |
| `units_moment`            | The units for the load text to display. Defaulted to loadProps `units_moment` value. Initialized to "kN-m".       |
| `radius`            | The radius for the moment. Defaulted to 0.6 * loadProps arrow_length value. Initialized to "kN-m".       |
| `start_angle`            | The start angle for the moment. Defaulted to 35.       |
| `end_angle`            | The end angle for the moment. Defaulted to 150      |
| `text_anchor`       | The text anchor position (if null then automatically set). Default null |
| `dominant_baseline` | The text [dominant baseline](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/dominant-baseline), position (if null then automatically set). Default null. |
| `rotate_text`    |  Rotation of text where 0 is horizontal. Default is null which matches text angle to angle of group.   |


## Other Engineering

Other engineering functions do not have a update default props function. 


| Function           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `addAxes`          | Adds axes to the SVG.                                                       |
| `addCentroid`      | Adds a centroid marker to the SVG.                                          |
| `addBolt`          | Adds a bolt representation to the SVG.                                      |

### addAxes

Adds axes to the SVG.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x`                | The x-coordinate of the origin of the axes.                                 |
| `y`                | The y-coordinate of the origin of the axes.                                 |
| `width`            | The width of the axes as a percentage of the page size. Defaults to 5.      |
| `height`           | The height of the axes as a percentage of the page size. Defaults to 5.     |
| `stroke_width`     | The stroke width of the axes. Defaults to 2.                                |
| `vertical_label`   | The label for the vertical axis. Defaults to `"Y"`.                         |
| `horizontal_label` | The label for the horizontal axis. Defaults to `"Z"`.                       |
| `vertical_color`   | The color of the vertical axis. Defaults to `"green"`.                      |
| `horizontal_color` | The color of the horizontal axis. Defaults to `"blue"`.                     |
| `font_size`        | The font size for the axis labels. Defaults to `"12px"`.                    |

### addCentroid

Adds a centroid marker to the SVG.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x`                | The x-coordinate of the centre of the centroid.                                           |
| `y`                | The y-coordinate of the centre of the centroid.                                           |
| `radius`           | The radius of the centroid marker as a percentage of the page size. Defaults to 1.5. |
| `color`            | The color of the centroid marker. Defaults to `"black"`.                    |
| `border_width`     | The stroke width of the outer circle of the centroid marker. Defaults to 1.5. |

### addBolt

Adds a bolt representation to the SVG.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x`                | The x-coordinate of the center of the bolt.                                 |
| `y`                | The y-coordinate of the center of the bolt.                                 |
| `size`             | The size (diameter) of the bolt. Defaults to 12.                                       |
| `fill_color_nut`       | The fill color of the nut. Defaults to `"grey"`.                           |
| `fill_color_bolt`       | The fill color of the bolt. Defaults to `"black"`.                           |
| `fill_opacity_nut`     | The fill opacity of the nut for the bolt. Defaults to 0.5.                              |
| `fill_opacity_bolt`     | The fill opacity of the bolt. Defaults to 1.                              |
| `stroke`           | The stroke color of the nut for the bolt. Defaults to `"black"`.                        |
| `stroke_width`     | The stroke width of the nut for the bolt. Defaults to 1.                                |
| `stroke_opacity`   | The stroke opacity of the nut for the bolt. Defaults to 0.                              |

## Concrete Drawing

Functions provided to help with the complete drawing of a concrete section. A general method is provided which can take any position or bars and has a flexible table that allows a user to enter whatever values they like beneath the drawing. A more rigid implementation is also provided for typical circle and rectangular reinforced sections.

### Functions

| Function                        | Description                                                                 |
|---------------------------------|-----------------------------------------------------------------------------|
| `drawConcreteSection`           | Draws a concrete rectangular or circular section with specified properties. Takes any coordinates for bars and horizontal or vertical shear ligatures. |
| `drawRectangularConcreteSection`| Draws a standard rectangular concrete section with specified properties.    |
| `drawCircularConcreteSection`   | Draws a standard circular concrete section with specified properties.       |


### drawConcreteSection

Draws a concrete section with specified properties.

| Property                          | Description                                                                 |
|-----------------------------------|-----------------------------------------------------------------------------|
| `shape`                           | The shape of the concrete section. Options are `"rectangular"` or `"circular"`. Defaults to `"rectangular"`. |
| `width`                           | The width of the rectangular section. Only for rectangular sections. Defaults to 100. |
| `depth`                           | The depth of the rectangular section. Only for rectangular sections. Defaults to 100. |
| `diameter`                        | The diameter of the circular section. Only for circular sections. Defaults to 100. |
| `bars`                            | An array of objects representing the reinforcement bars. Each object should have properties `x`, `y`, and `d` (diameter). Defaults to an empty array. |
| `cover`                           | The cover distance for the reinforcement bars. Controls external shear reinforcement position and error checking for reinforcement. Defaults to 50. |
| `external_shear_reinforcement_size` | The size of the external shear reinforcement. Defaults to 0. |
| `internal_shear_reinforcement_size` | The size of the internal (outer) shear reinforcement. Defaults to 0. |
| `show_shear_reo_multirow` | If true draws additional shear reo against internal additional top and bottom rows based on external_shear_reinforcement_size and internal_shear_reinforcement_size. Defaults to true. |
| `external_shear_reinforcement_spiral` | Whether to draw a spiral for the external shear reinforcement. If false, draw reinforcement ties. Defaults to true. |
| `additional_shear_reinforcement`  | An array of objects representing additional shear reinforcement. Each object should have properties `x1`, `y1`, `x2`, `y2`, `d` (diameter), `r` (radius of bend), `p1_hook` (boolean for hook at point 1), and `p2_hook` (boolean for hook at point 2). Defaults to an empty array. |
| `length_units`                    | The units for length measurements. Defaults to `"mm"`. |
| `size_bars_bottom`                | The size of the bars at the bottom. Used for rounding external and spacing reinforcement ties. If null, uses the median bar size in the `bars` list. Defaults to null. |
| `size_bars_top`                   | The size of the bars at the top. Used for rounding external and spacing reinforcement ties. If null, uses the median bar size in the `bars` list. Defaults to null. |
| `size_bars_left`                   | The size of the bars at the left. Used for positioning internal reinforcement if > 0. If null, uses the median bar size in the `bars` list. Defaults to null. |
| `size_bars_right`                   | The size of the bars at the right. Used for positioning internal reinforcement if > 0. If null, uses the median bar size in the `bars` list. Defaults to null. |
| `table_heading`                   | An array of strings representing the table headings. Defaults to an empty array. |
| `table_data`                      | An array of arrays representing the rows of the table. Each inner array represents a row, and each element in the inner array represents a cell. Defaults to an empty array. |
| `dimline_font_size`               | The font size for dimension lines. Defaults to 14. |
| `font_size`                       | The font size for text. Defaults to 12. |
| `heading_font_size`               | The font size for table headings. Defaults to 14. |
| `heading_fill_color`              | The fill color for table headings. Defaults to `"white"`. |
| `heading_fill_opacity`            | The fill opacity for table headings. Defaults to 1. |
| `bar_min_clear_spacing`           | The minimum clear spacing for bars. Defaults to 20 mm or 1 inch if null. |
| `bar_max_clear_spacing`           | The maximum clear spacing for bars. Defaults to 300 mm or 12 inches if null. |
| `shear_min_clear_spacing`         | The minimum clear spacing for shear reinforcement. Defaults to 20 mm or 1 inch if null. |
| `shear_max_clear_spacing`         | The maximum clear spacing for shear reinforcement. Defaults to 300 mm or 12 inches if null. |
| `axes`                            | Whether to draw axes. Defaults to true. |
| `axes_lines`                      | Whether to draw lines for the axes. Defaults to true. |
| `flange_depth`                    | The depth of the flange in a T-Section. Defaults to 0. |
| `flange_width`                    | The width of the flange in a T-Section. Defaults to 0. |
| `spacing_bars_flange_top`         | The spacing of the bars in the top of the flange for a T-Section. Defaults to 0. |
| `size_bars_flange_top`            | The size of the bars in the top of the flange for a T-Section. Defaults to 0. |
| `spacing_bars_flange_bottom`      | The spacing of the bars in the bottom of the flange for a T-Section. Defaults to 0. |
| `size_bars_flange_bottom`         | The size of the bars in the bottom of the flange for a T-Section. Defaults to 0. |
| `flange_continuous`               | Whether the flange is continuous (ie slab extends to left and right) or ends. Defaults to true. |
| `flange_cover`                    | The cover distance for the flange reinforcement, does not consider shear ligatures. Defaults to 50. |


### drawRectangularConcreteSection

Draws a standard rectangular concrete section with specified properties.

| Property                          | Description                                                                 |
|-----------------------------------|-----------------------------------------------------------------------------|
| `width`                           | The width of the rectangular section.                                       |
| `depth`                           | The depth of the rectangular section.                                       |
| `n_bars_top`                      | The number of bars at the top. Defaults to 2.                               |
| `n_bars_bottom`                   | The number of bars at the bottom. Defaults to 2.                            |
| `n_bars_left`                     | The number of bars on the left side. Defaults to 2.                         |
| `n_bars_right`                    | The number of bars on the right side. Defaults to 2.                        |
| `size_bars_top`                   | The size of the bars at the top. Defaults to 10.                            |
| `size_bars_bottom`                | The size of the bars at the bottom. Defaults to 10.                         |
| `size_bars_left`                  | The size of the bars on the left side. Defaults to 10.                      |
| `size_bars_right`                 | The size of the bars on the right side. Defaults to 10.                     |
| `top_rows`                        | The number of rows of top bars. Defaults to 1.                               |
| `bottom_rows`                     | The number of rows of bottom bars. Defaults to 1.                            |
| `top_row_spacing`                 | The spacing between the bar rows at the top. Defaults to 50.                    |
| `bottom_row_spacing`              | The spacing between the bar rows at the bottom. Defaults to 50.                 |
| `cover`                           | The cover distance for the reinforcement bars. Controls external shear reinforcement position and error checking for reinforcement. Defaults to 50. |
| `external_shear_reinforcement_size` | The size of the external shear reinforcement. Defaults to 8.                |
| `internal_shear_reinforcement_size` | The size of the internal (outer) shear reinforcement. Defaults to 0.                |
| `external_shear_reinforcement_spiral` | Whether to draw a spiral for the external shear reinforcement. If false, draw reinforcement ties. Defaults to true. |
| `n_shear_bars_horizontal`         | The number of horizontal shear bars. Defaults to 0.                         |
| `n_shear_bars_vertical`           | The number of vertical shear bars. Defaults to 0.                           |
| `size_shear_bars_horizontal`      | The size of the horizontal shear bars. Defaults to 8.                       |
| `size_shear_bars_vertical`        | The size of the vertical shear bars. Defaults to 8.                         |
| `length_units`                    | The units for length measurements. Defaults to `"mm"`.                      |
| `show_table`                      | Whether to show the table. Defaults to true.                                |
| `dimline_font_size`               | The font size for dimension lines. Defaults to 14.                          |
| `font_size`                       | The font size for text. Defaults to 12.                                     |
| `heading_font_size`               | The font size for table headings. Defaults to 14.                           |
| `heading_fill_color`              | The fill color for table headings. Defaults to `"white"`.                   |
| `heading_fill_opacity`            | The fill opacity for table headings. Defaults to 1.                         |
| `bar_min_clear_spacing`           | The minimum clear spacing for bars. Defaults to 20 mm.                      |
| `bar_max_clear_spacing`           | The maximum clear spacing for bars. Defaults to 300 mm.                     |
| `shear_min_clear_spacing`         | The minimum clear spacing for shear reinforcement. Defaults to 20 mm.       |
| `shear_max_clear_spacing`         | The maximum clear spacing for shear reinforcement. Defaults to 300 mm.      |
| `axes`                            | Whether to draw axes. Defaults to true.                                     |
| `axes_lines`                      | Whether to draw lines for the axes. Defaults to true.                       |
| `dimension_spacing`               | Whether to show dimension spacing. Defaults to false.                       |
| `max_table_dp`                    | The maximum number of decimal places for the table. Defaults to 3.          |
| `show_shear_reo_multirow` | If true draws additional shear reo against internal additional top and bottom rows based on external_shear_reinforcement_size and internal_shear_reinforcement_size. Defaults to true. |
| `allocate_horizontal_shear_bars_multirow` | Whether or not horizontal shear bars should be added to the extra top and bottom rows. Default false. Should not be used in combination with show_shear_reo_multirow since they would both place shear reo at the same location.             |
| `flange_depth`                    | The depth of the flange in a T-Section. Defaults to 0. |
| `flange_width`                    | The width of the flange in a T-Section. Defaults to 0. |
| `spacing_bars_flange_top`         | The spacing of the bars in the top of the flange for a T-Section. Defaults to 0. |
| `size_bars_flange_top`            | The size of the bars in the top of the flange for a T-Section. Defaults to 0. |
| `spacing_bars_flange_bottom`      | The spacing of the bars in the bottom of the flange for a T-Section. Defaults to 0. |
| `size_bars_flange_bottom`         | The size of the bars in the bottom of the flange for a T-Section. Defaults to 0. |
| `flange_continuous`               | Whether the flange is continuous (ie slab extends to left and right) or ends. Defaults to true. |
| `flange_cover`                    | The cover distance for the flange reinforcement, does not consider shear ligatures. Defaults to 50. |


### drawCircularConcreteSection

Draws a standard circular concrete section with specified properties.

| Property                          | Description                                                                 |
|-----------------------------------|-----------------------------------------------------------------------------|
| `diameter`                        | The diameter of the circular section.                                       |
| `n_bars_circle`                   | The number of bars in the circular section.                                 |
| `size_bars_circle`                | The size of the bars in the circular section.                               |
| `angle`                           | The angle of the bars in the circular section. Defaults to 0.               |
| `cover`                           | The cover distance for the reinforcement bars. Controls external shear reinforcement position and error checking for reinforcement. Defaults to 50. |
| `external_shear_reinforcement_size` | The size of the external shear reinforcement. Defaults to 8.                |
| `internal_shear_reinforcement_size` | The size of the internal (outer) shear reinforcement. Defaults to 0.                |
| `external_shear_reinforcement_spiral` | Whether to draw a spiral for the external shear reinforcement. If false, draw reinforcement ties. Defaults to true. |
| `length_units`                    | The units for length measurements. Defaults to `"mm"`.                      |
| `show_table`                      | Whether to show the table. Defaults to true.                                |
| `dimline_font_size`               | The font size for dimension lines. Defaults to 14.                          |
| `font_size`                       | The font size for text. Defaults to 12.                                     |
| `heading_font_size`               | The font size for table headings. Defaults to 14.                           |
| `heading_fill_color`              | The fill color for table headings. Defaults to `"white"`.                   |
| `heading_fill_opacity`            | The fill opacity for table headings. Defaults to 1.                         |
| `bar_min_clear_spacing`           | The minimum clear spacing for bars. Defaults to 20 mm.                      |
| `bar_max_clear_spacing`           | The maximum clear spacing for bars. Defaults to 300 mm.                     |
| `shear_min_clear_spacing`         | The minimum clear spacing for shear reinforcement. Defaults to 20 mm.       |
| `shear_max_clear_spacing`         | The maximum clear spacing for shear reinforcement. Defaults to 300 mm.      |
| `axes`                            | Whether to draw axes. Defaults to true.                                     |
| `axes_lines`                      | Whether to draw lines for the axes. Defaults to true.                       |
| `max_table_dp`                    | The maximum number of decimal places for the table. Defaults to 3.          |

## Concrete Drawing Helper Functions

Functions to help with concrete drawings.

### Functions
| Function                        | Description                                                                 |
|---------------------------------|-----------------------------------------------------------------------------|
| `getCircularBars`               | Calculates the positions of bars in a circular concrete section.            |
| `getRectangularBars`            | Calculates the positions of bars in a rectangular concrete section.         |
| `checkBarCoverOkayCircular`     | Checks if the bar cover is okay for a circular concrete section.            |
| `checkBarCoverOkayRectangular`  | Checks if the bar cover is okay for a rectangular concrete section.         |
| `clearSpaceBetweenBars`         | Calculates the clear space between two bars.                                |
| `clearSpaceBetweenLigs`         | Calculates the clear space between two ligatures.                           |
| `getLigAngle`                   | Calculates the angle of a ligature from the datum.                          |
| `clearSpaceBetweenAllParallelLigs` | Calculates the minimum clear space between a ligature and all parallel ligatures in a list. |
| `clearSpaceBetweenAllBars`      | Calculates the minimum clear space between a bar and all other bars in a list. |
| `getLigatures`                  | Get a list of ligatures (excluding the external reo) that can then be passed to the drawConcreteSection function as additional_shear_reinforcement |


### getCircularBars

Calculates the positions of bars in a circular concrete section.

| Property                          | Description                                                                 |
|-----------------------------------|-----------------------------------------------------------------------------|
| `concrete_diameter`               | The diameter of the concrete section.                                       |
| `total_cover`                     | The total cover distance for the reinforcement bars.                        |
| `size_bars_circle`                | The size of the bars in the circular section.                               |
| `n_bars_circle`                   | The number of bars in the circular section.                                 |
| `cx`                              | The x-coordinate of the center of the circle. If null, will be the center of the circle. Defaults to null. |
| `cy`                              | The y-coordinate of the center of the circle. If null, will be the center of the circle. Defaults to null. |
| `angle`                           | The angle of the bars in the circular section. Defaults to 0.               |

### getRectangularBars

Calculates the positions of bars in a rectangular concrete section.

| Property                          | Description                                                                 |
|-----------------------------------|-----------------------------------------------------------------------------|
| `width`                           | The width of the rectangular section.                                       |
| `depth`                           | The depth of the rectangular section.                                       |
| `total_cover`                     | The total cover distance for the reinforcement bars.                        |
| `n_bars_bottom`                   | The number of bars at the bottom.                                           |
| `n_bars_top`                      | The number of bars at the top.                                              |
| `n_bars_left`                     | The number of bars on the left side.                                        |
| `n_bars_right`                    | The number of bars on the right side.                                       |
| `size_bars_bottom`                | The size of the bars at the bottom.                                         |
| `size_bars_top`                   | The size of the bars at the top.                                            |
| `size_bars_left`                  | The size of the bars on the left side.                                      |
| `size_bars_right`                 | The size of the bars on the right side.                                     |

### checkBarCoverOkayCircular

Checks if the bar cover is okay for a circular concrete section.

| Property                          | Description                                                                 |
|-----------------------------------|-----------------------------------------------------------------------------|
| `bar`                             | The bar object to check.                                                    |
| `diameter`                        | The diameter of the circular section.                                       |
| `cover`                           | The cover distance for the reinforcement bars. Controls external shear reinforcement position and error checking for reinforcement. |
| `external_shear_reinforcement_size` | The size of the external shear reinforcement.                              |
| `length_units`                    | The units for length measurements. Defaults to `"mm"`.                      |

### checkBarCoverOkayRectangular

Checks if the bar cover is okay for a rectangular concrete section.

| Property                          | Description                                                                 |
|-----------------------------------|-----------------------------------------------------------------------------|
| `bar`                             | The bar object to check.                                                    |
| `width`                           | The width of the rectangular section.                                       |
| `depth`                           | The depth of the rectangular section.                                       |
| `cover`                           | The cover distance for the reinforcement bars. Controls external shear reinforcement position and error checking for reinforcement. |
| `external_shear_reinforcement_size` | The size of the external shear reinforcement.                              |
| `length_units`                    | The units for length measurements. Defaults to `"mm"`.                      |

### clearSpaceBetweenBars

Calculates the clear space between two bars.

| Property | Description                                                                 |
|----------|-----------------------------------------------------------------------------|
| `bar1`   | The first bar object with properties `x`, `y`, and `d` (diameter).          |
| `bar2`   | The second bar object with properties `x`, `y`, and `d` (diameter).         |

**Returns:** The clear space between the two bars.

### clearSpaceBetweenLigs

Calculates the clear space between two ligatures.

| Property | Description                                                                 |
|----------|-----------------------------------------------------------------------------|
| `lig1`   | The first ligature object with properties `x1`, `y1`, `x2`, `y2`, and `d` (diameter). |
| `lig2`   | The second ligature object with properties `x1`, `y1`, `x2`, `y2`, and `d` (diameter). |

**Returns:** The minimum clear space between the ends of the two ligatures.

### getLigAngle

Calculates the angle of a ligature from the datum.

| Property | Description                                                                 |
|----------|-----------------------------------------------------------------------------|
| `lig`    | The ligature object with properties `x1`, `y1`, `x2`, and `y2`.             |

**Returns:** The angle of the ligature from the datum.

### clearSpaceBetweenAllParallelLigs

Calculates the minimum clear space between a ligature and all parallel ligatures in a list.

| Property | Description                                                                 |
|----------|-----------------------------------------------------------------------------|
| `lig1`   | The ligature object to compare with the list.                               |
| `ligs`   | An array of ligature objects.                                               |

**Returns:** The minimum clear space between the ligature and all parallel ligatures in the list.

### clearSpaceBetweenAllBars

Calculates the minimum clear space between a bar and all other bars in a list.

| Property | Description                                                                 |
|----------|-----------------------------------------------------------------------------|
| `bar1`   | The bar object to compare with the list.                                    |
| `bars`   | An array of bar objects.                                                    |

**Returns:** The minimum clear space between the bar and all other bars in the list.



### getLigatures

Gets a list of ligatures (excluding the external reinforcement) that can be passed to the `drawConcreteSection` function as `additional_shear_reinforcement`.

| Property                          | Description                                                                 |
|-----------------------------------|-----------------------------------------------------------------------------|
| `shape`                           | The shape of the concrete section. Options are `"rectangular"` or `"circular"`. Defaults to `"rectangular"`. |
| `width`                           | The width of the rectangular section. Defaults to 0.                        |
| `depth`                           | The depth of the rectangular section. Defaults to 0.                        |
| `n_shear_bars_horizontal`         | The number of horizontal shear bars. Defaults to 0.                         |
| `n_shear_bars_vertical`           | The number of vertical shear bars. Defaults to 0.                           |
| `size_shear_bars_horizontal`      | The size of the horizontal shear bars. Defaults to 0.                       |
| `size_shear_bars_vertical`        | The size of the vertical shear bars. Defaults to 0.                         |
| `cover`                           | The cover distance for the reinforcement bars. Controls external shear reinforcement position and error checking for reinforcement. Defaults to 0. |
| `external_shear_reinforcement_size` | The size of the external shear reinforcement. Defaults to 0.                |
| `size_bars_top`                   | The size of the bars at the top. Defaults to 0.                             |
| `size_bars_bottom`                | The size of the bars at the bottom. Defaults to 0.                          |
| `size_bars_left`                  | The size of the bars on the left side. Defaults to 0.                       |
| `size_bars_right`                 | The size of the bars on the right side. Defaults to 0.                      |

**Returns:** An array of ligature objects, each with properties `x1`, `y1`, `x2`, `y2`, `d` (diameter), `r` (radius of bend), `p1_hook` (boolean for hook at point 1), and `p2_hook` (boolean for hook at point 2).

## Helper Functions

These functions are not used for drawing SVG but are useful in the creation of new functions and are used extensively in the black box of the other functions.

| Function                | Description                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| `transformPoint`        | Transforms a point {x,y} from the conceptual coordinate system to the actual canvas coordinates                |
| `transformX`            | Transforms an x-coordinate from conceptual to canvas coordinate system.      |
| `transformY`            | Transforms a y-coordinate from conceptual to canvas coordinate system.          |
| `distanceBetweenPoints` | Calculates the Euclidean distance between two points {x,y} notation in 2D space.           |
| `rotatePoint`           | Rotates a point {x,y} around a specified rotation point {x,y} by a given angle.         |
| `calculateAngleFromDatum` | Calculates the angle between two points {x,y} from the x-axis in degrees.       |


### transformPoint

Transforms a point based on the current coordinate system.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `p`                | The point to transform.                                                     |
| `p.x`              | The x-coordinate of the point.                                              |
| `p.y`              | The y-coordinate of the point.                                              |

### transformX

Transforms an x-coordinate based on the current coordinate system.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `x`                | The x-coordinate to transform.                                              |


### transformY

Transforms a y-coordinate based on the current coordinate system.

Note: Inverting is the default approach since the SVG defines the top left as the datum and has Y+ve as down. Using the inversion allows the coordinate system to effectively become the bottom left of the page to match standard drawing convention.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `y`                | The y-coordinate to transform.                                              |
| `invert`           | Whether to invert the y-coordinate. Defaults to true.                       |

### distanceBetweenPoints

Calculates the Euclidean distance between two points in 2D space.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `p1`               | The first point.                                                            |
| `p1.x`             | The x-coordinate of the first point.                                         |
| `p1.y`             | The y-coordinate of the first point.                                         |
| `p2`               | The second point.                                                           |
| `p2.x`             | The x-coordinate of the second point.                                        |
| `p2.y`             | The y-coordinate of the second point.                                        |

### rotatePoint

Rotates a point around a specified rotation point by a given angle.

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `point`            | The point to rotate.                                                        |
| `point.x`          | The x-coordinate of the point.                                              |
| `point.y`          | The y-coordinate of the point.                                              |
| `rotation_point`   | The center of rotation.                                                     |
| `rotation_point.x` | The x-coordinate of the rotation center.                                     |
| `rotation_point.y` | The y-coordinate of the rotation center.                                     |
| `angle`            | The rotation angle in degrees, counterclockwise. Defaults to 0.             |

### calculateAngleFromDatum

Calculates the angle between two points from the x-axis in degrees.

Conceptually take p1 to be the (0,0) point. Draw a line to the right. Spin it anti-clockwise until you hit the other point. That is the angle that gets returned.  

| Property           | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `p1`               | The first point.                                                            |
| `p1.x`             | The x-coordinate of the first point.                                         |
| `p1.y`             | The y-coordinate of the first point.                                         |
| `p2`               | The second point.                                                           |
| `p2.x`             | The x-coordinate of the second point.                                        |
| `p2.y`             | The y-coordinate of the second point.                                        |

## Changelog

27.03.2025
- added T-Section for drawing concrete functions

14.03.2025
- added option for reversing arrow direction for addForce
- added option for reversing arrow direction in place for addLoadGroup through `Fx_reverse` and `Fy_reverse` properties

30.01.2025
- bug fix for drawing horizontal rebar with multiple top or bottom rows

24.01.2025
- added the addPolyLine function which is similar to the addPolygon function and takes a list of coordinates
- added the addDoubleBreakLine function which is similar to addBreakLine but adds two adjacent breaklines with a fill in the centre
- both new functions added to the line group

23.01.2025
- update for addText to be able to handle `<br>` tag
- added parameter (br_line_spacing) to addText to also be able to control the line spacing between text lines where `br` is used. 

22.01.2025
- update for text to have font_style property to allow for italic text
- text opacity fix for dimLineDrawer

14.01.2025
- updated addSegment to allow negative angles so that major segments can be drawn

13.01.2025
- option to reverse arrow direction in addArrow
- option to move text to tail in addForce

10.01.2025
- update for concrete drawing warning display to be in correct position
- update for concrete drawings to allow for internal reo to be drawn
- update for drawRectangularConcreteSection to allow for multiple rows of bars
- update for drawRectangularConcreteSection to have option to draw shear reo against additional top and bottom rows
- update for concrete drawings to allow specification of maximum number of decimal places for reo table.
- update for concrete drawing table to include additional rows of bars and internal reo size if specified.


09.01.2025
- update for getLigatures function for concrete drawings

08.01.2025
- absmax_text for addTrapezoidal function to allow showing text as absolute values

17.12.2024
- addUDL and addTrapezoidal now have rotate_text, dominant_baseline and text_anchor for manually editing text placement.
- Warning descriptions in concrete drawings

16.12.2024
- update for concrete drawings

13.12.2024
- text_at_tail option for addMoment to allow text to also be placed next to the head of the moment arc

12.12.2024
- bug fix for table text spacing
- function to get table dimensions
- update to setBoundary to allow a footer space to be allocated with the main purpose of placing a table

10.12.2024
- added table in text group

3.12.2024
- added support for sub and sup tags in text to allow for superscript and subscript
- added in dominant_baseline and text_anchor properties to addLoadGroup, addForce and addMoment to allow default behavior to be overridden (default is null for both)
- added in rotate_text to addLoadGroup, addForce and addMoment to allow a user to specify a text rotation. 
- updated quick design demo to reflect changes 
- fixed bug for dimLineDrawer when x1 > x2