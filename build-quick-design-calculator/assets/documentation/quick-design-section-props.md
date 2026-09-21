---
id: quick-design-section-props
title: Quick Design Section Properties
noIndex: true
---

The Quick Design Section Properties library has been developed to standardize the creation of custom steel cross-sections in quick design calculations. These functions take the dimensions of a custom section and return a section object with commonly used section properties. The section object mimics the format of a section pulled from the SkyCiv database using the await Database.getSection() function. The sample return format is outlined below.

**NOTE**: All section properties are taken with respect to the global Z and Y axis. This axis is equivalent to the principal axis for all shapes other than angle sections. These functions do not produce results relative to the principal axes for angle sections.

```js
var sect = {
	"shape": "ibeam",
	"dimensions": {
		"BFt": 
		"BFw": 
		"TFt": 
		"TFw": 
		"Wt": 
		"h": 
		"r": 
		},
	"results": {
		"A":  //Gross section area
		"Cy": //Centroid taken from the bottom of section
		"Cz": //Centroid taken from the left side of section
		"Iyp": //Moment of Inertia about Y axis
		"Izp": //Moment of Inertia about Z axis
		"ry":  //Radius of Gyration about Y axis
		"rz":  //Radius of Gyration about Z axis
		"shear_area_y": //Shear area in Y direction (Not available for hat, angle or solid sections)
		"shear_area_z": //Shear area in Z direction (Not available for hat, angle or solid sections)
		"r0":  //Polar Radius of Gyration (Not available for hat or angle sections)
		"shear_center": [Z, Y] //Distance from shear centre to centroid in Z axis (first value) and Y axis (second value) (Not available for hat or angle sections)
		"Qy": //First/static Moment of area about Y axis (Not available for hat sections)
		"Qz": //First/static Moment of area about Z axis (Not available for hat sections)
		"Zyp_top": //Elastic section modulus about Y axis (centroid is taken from right side of section)
		"Zyp_btm": //Elastic section modulus about Y axis (centroid is taken from left side of section)
		"Zzp_top": //Elastic section modulus when about Z axis (centroid is taken from top of section)
		"Zzp_btm": //Elastic section modulus when about Z axis (centroid is taken from btm of section)
		"PNAy": //Plastic neutral axis location taken from btm side of section
		"PNAz": //Plastic neutral axis location taken from left side of section
		"Syp": //Plastic section modulus about Y axis
		"Szp": //Plastic section modulus about Z axis
		"J": //Torsion constant (Not available for hat sections)
		"Iw": //Warping constant (Not available for hat sections)
	}
}
```

## Installation

You can install the section props library as follows:

```js
const sectionProps = SectionProps;
```

## Supported Sections

- I Sections
- T Sections
- Channel Sections
- Angle Sections
- Rectangular Hollow Sections
- Circular Hollow Sections
- Hat Sections
- Solid Rectangular Sections
- Solid Circular Sections

## Region Option

Some shapes properties are calculated differently in different design codes. The *region* option is used to control which code is adopted. Supported regions are outlined below. AS is the default region for all shapes.

| Code 		| Standard   	 |
|-----------|----------------|
| `AS`   	| AS 4100 		 |
| `EN`		| EN 1993-1-1 	 |
| `US`		| AISC 360 		 |
| `CA`		| CSA S16	 	 |


## Functions

### `ISectionProperties(d, b, t_f, t_w, r, region)`

Calculates the section properties for a custom I section. 

| Parameter | Type   		 | Description              	  								 |
|-----------|----------------|---------------------------------------------------------------|
| `d`   	| number 		 | Total section depth	 								 		 |
| `b`  		| number 		 | Total flange width   	  									 |
| `t_f`  	| number 		 | Section flange thickness      	  							 |
| `t_w`  	| number 		 | Section web thickness				   	  					 |
| `r`	  	| number 		 | Fillet radius (Default r = 0)	   	  						 |
| `region`  | string 		 | Design code region (Default is AS = AS 4100)			 		 |


**Returns**: object - Object containing section properties.

#### Example Code 

In the calculate.js (or util) file.

```js
const sectionProps = SectionProps;
let sect = sectionProps.ISectionProperties(d_input, b_input, t_f_input, t_w_input, r_input, "AS");
```

### `TSectionProperties(d, b, t_f, t_w, r, region)`

Calculates the section properties for a custom T section. 

| Parameter | Type   		 | Description              	  								 |
|-----------|----------------|---------------------------------------------------------------|
| `d`   	| number 		 | Total section depth	 								 		 |
| `b`  		| number 		 | Total flange width   	  									 |
| `t_f`  	| number 		 | Section flange thickness      	  							 |
| `t_w`  	| number 		 | Section web thickness				   	  					 |
| `r`	  	| number 		 | Fillet radius (Default r = 0)	   	  						 |
| `region`  | string 		 | Design code region (Default is AS = AS 4100)			 		 |


**Returns**: object - Object containing section properties.

#### Example Code 

In the calculate.js (or util) file.

```js
const sectionProps = SectionProps;
let sect = sectionProps.TSectionProperties(d_input, b_input, t_f_input, t_w_input, r_input, "AS");
```

### `PFCSectionProperties(d, b, t_f, t_w, r, region)`

Calculates the section properties for a custom Channel section. 

| Parameter | Type   		 | Description              	  								 |
|-----------|----------------|---------------------------------------------------------------|
| `d`   	| number 		 | Total section depth	 								 		 |
| `b`  		| number 		 | Total flange width   	  									 |
| `t_f`  	| number 		 | Section flange thickness      	  							 |
| `t_w`  	| number 		 | Section web thickness				   	  					 |
| `r`	  	| number 		 | Fillet radius (Default r = 0)	   	  						 |
| `region`  | string 		 | Design code region (Default is AS = AS 4100)			 		 |


**Returns**: object - Object containing section properties.

#### Example Code 

In the calculate.js (or util) file.

```js
const sectionProps = SectionProps;
let sect = sectionProps.PFCSectionProperties(d_input, b_input, t_f_input, t_w_input, r_input, "AS");
```

### `AngleSectionProperties(d, b, t_f, t_w, r, region)`

Calculates the section properties for a custom Angle section. 

NOTE: All section properties are taken with respect to the global Z and Y axis. The principal axes for an angle section are generally not equivalent to the global Z and Y axis, meaning the function results for angle sections are not about the principal axes.

| Parameter | Type   		 | Description              	  								 |
|-----------|----------------|---------------------------------------------------------------|
| `d`   	| number 		 | Vertical leg length	 								 		 |
| `b`  		| number 		 | Horizontal leg length   	  									 |
| `t_f`  	| number 		 | Horizontal leg thickness      	  							 |
| `t_w`  	| number 		 | Vertical leg thickness				   	  					 |
| `r`	  	| number 		 | Fillet radius (Default r = 0)	   	  						 |
| `region`  | string 		 | Design code region (Default is AS = AS 4100)			 		 |


**Returns**: object - Object containing section properties.

#### Example Code 

In the calculate.js (or util) file.

```js
const sectionProps = SectionProps;
let sect = sectionProps.AngleSectionProperties(d_input, b_input, t_f_input, t_w_input, r_input, "AS");
```

### `RHSSectionProperties(d, b, t_f, t_w, r, region)`

Calculates the section properties for a custom Rectangular Hollow Section. 

| Parameter | Type   		 | Description              	  								 |
|-----------|----------------|---------------------------------------------------------------|
| `d`   	| number 		 | Total section height	 								 		 |
| `b`  		| number 		 | Total section width   	  									 |
| `t_f`  	| number 		 | Horizontal (top) wall thickness     	  						 |
| `t_w`  	| number 		 | Vertical (side) wall thickness				   	  			 |
| `r`	  	| number 		 | Fillet radius (Default r = 0)	   	  						 |
| `region`  | string 		 | Design code region (Default is AS = AS 4100)			 		 |


**Returns**: object - Object containing section properties.

#### Example Code 

In the calculate.js (or util) file.

```js
const sectionProps = SectionProps;
let sect = sectionProps.RHSSectionProperties(d_input, b_input, t_f_input, t_w_input, r_input, "AS");
```

### `CHSSectionProperties(d, t_f, region)`

Calculates the section properties for a custom Circular Hollow Section. 

| Parameter | Type   		 | Description              	  								 |
|-----------|----------------|---------------------------------------------------------------|
| `d`   	| number 		 | Outer diameter		 								 		 |
| `t_f`  	| number 		 | Wall thickness     	  							 			 |
| `region`  | string 		 | Design code region (Default is AS = AS 4100)			 		 |


**Returns**: object - Object containing section properties.

#### Example Code 

In the calculate.js (or util) file.

```js
const sectionProps = SectionProps;
let sect = sectionProps.CHSSectionProperties(d_input, t_f_input, "AS");
```

### `HatSectionProperties = (d, b_1, b_2, t_f)`

Calculates the section properties for a custom Hat section. 

| Parameter | Type   		 | Description              	  								 |
|-----------|----------------|---------------------------------------------------------------|
| `d`   	| number 		 | Total depth of section 								 		 |
| `b_1`  	| number 		 | Top flange width    	  							 			 |
| `b_2`  	| number 		 | Btm leg width     	  							 			 |
| `t_f`  	| number 		 | Thickness of section  	  							 		 |


**Returns**: object - Object containing section properties. Note, this function does not currently calculate J or Iw values for a hat section.

#### Example Code 

In the calculate.js (or util) file.

```js
const sectionProps = SectionProps;
let sect = sectionProps.HatSectionProperties(d_input, b_1_input, b_2_input, t_f_input);
```

### `SolidRectangleProperties = (d, b)`

Calculates the section properties for a custom Solid Rectangle section. 

| Parameter | Type   		 | Description              	  								 |
|-----------|----------------|---------------------------------------------------------------|
| `d`   	| number 		 | Total depth of section 								 		 |
| `b`	  	| number 		 | Top width of section	  							 			 |


**Returns**: object - Object containing section properties.

#### Example Code 

In the calculate.js (or util) file.

```js
const sectionProps = SectionProps;
let sect = sectionProps.SolidRectangleProperties(d_input, b_input);
```

### `SolidCircleProperties  = (b)`

Calculates the section properties for a custom Solid Circle section. 

| Parameter | Type   		 | Description              	  								 |
|-----------|----------------|---------------------------------------------------------------|
| `b`	  	| number 		 | Outer diameter of section							 		 |


**Returns**: object - Object containing section properties.

#### Example Code 

In the calculate.js (or util) file.

```js
const sectionProps = SectionProps;
let sect = sectionProps.SolidCircleProperties (b_input);
```
