---
id: quick-design-sb-integration
title: Sections/Materials Database
noIndex: true
---

## Sections DB Integration

Quick Design is integrated with the SkyCiv Sections Database. The following functions are available in `calculate.js`

### `Database.getSection(section_map, unit_system)`
Gets the section properties from the API
#### Example
```js
let res = await Database.getSection(JSON.stringify(["American", "AISC", "W shapes", shape_value]), "metric");
```

### `Database.getShapes(library, shape)`
Gets the section list and properties from SkyCiv Servers
#### Example
```js
let res = await Database.getShapesList("AISC", "S Shapes");
```

### `Database.getShapesList(library, shape)`
Gets the section list from SkyCiv Servers, without properties.
#### Example
```js
let res = await Database.getShapesList("AISC", "S Shapes");
```


## Materials DB Integration

### `Database.getMaterial(query)`
Gets the material properties from the API
```js
let res = await Database.getMaterial(["Metric", "Wood", "Eurocode EN1995-1-1:2004", "Deciduous species", "D30"]);
```

## Section Object in the config.js

You can also use the `"type": "section"` in the config.js to automatically load a dropdown of shapes from a section library.

### Example

```js
"shape_value": {
	"label": "Shape:",
	"type": "section",
	"country": "American",
	"library": "AISC",
	"shape": "W shapes",
	"default": "W6x16"
}
```

### Example (Advanced)

Support for some advanced options exists. 

```js
"c_section_with_custom": {
	"label": "Section with Custom",
	"type": "section",
	"country": "Australian",
	"library": "Steel (250 Grade)",
	"shape": ["Circular hollow sections (250)", "Circular hollow sections (350)"], // Combine shape libraries
	"shape_label_append": ["(250)", "(350)"], // If using an array to combine sections then append these values to sections from corresponding library
	"custom_option": "Custom", // Optional: Add to custom option to the dropdown 
	"default": "17x2.3 CHS"
}
```

## Quick Design Section Properties

To calculate your own Section Properties from Quick Design try the [Quick Design Section Properties Docs](/api/v3/docs/quick-design-section-props).