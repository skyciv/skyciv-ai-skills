---
id: quick-design-ui
title: UI File
noIndex: true
---

The ui.js file constitutes a dynamic solution for updating the user interface of our calculator, which responds in real-time to user inputs. The file is constructed using javascript, featuring compatibility with either [jQuery](https://jquery.com/) or generic vanilla javascript for DOM manipulation. Upon each user input, the file is executed for seamless interface updates.

Moreover, the file is capable of updating both the canvas and div elements specified within the input variables of your config.json, making it a versatile tool for UI enhancements.

:::tip
Use var instead of let in the ui.js to avoid console errors. Variable declaration with const and let can happen at a function level. 
::::

## Template

```js

// Note:
// You must use var instead of let in this template to have the ui.js working properly.

// Get the current input from your calculator
var input = SKYCIV_DESIGN.generateInput()

// Replace ui-canvas with whatever id you have given your canvas
var canvas = document.getElementById("ui-canvas");
var ctx = canvas.getContext("2d");

// Clear the previous data on the canvas
ctx.clearRect(0, 0, canvas.width, canvas.height);

ctx.fillText("Updating the canvas with some text");

```

## Getting input in the ui.js

### SKYCIV_DESIGN.generateInput(convert_to_base_unit_system)

The SKYCIV_DESIGN.generateInput(convert_to_base_unit_system) function is used to get the current input in the ui.js file. 
The `convert_to_base_unit_system` flag can be used convert the input back to the default_unit_system used in the calculate.js.

## Structuring graphics to work with both unit systems

It is suggested the the following layout can be used to create graphics that work with both unit systems.

```js

// Get the current converted input from your calculator
var input = SKYCIV_DESIGN.generateInput(true);

// Get the current input to display in the labels
var input_labels = SKYCIV_DESIGN.generateInput(false);

// Deal with unit systems if needed
var units = {
    F: 'kN',
    L: 'mm',
    M: 'kN/m'
};

if (SKYCIV_DESIGN.units.getCurrentUnitSystem() == 'imperial') {
    units.F = 'kip';
    units.L = 'in';
    units.M = 'kip/ft';
}

```

## Packages 

### SVG Section Dimensions

See the [SVG Section Dimensions Documentation](/api/v3/docs/quick-design-sections/).

### SVG Creator Package

See the [SVG Creator Documentation](/api/v3/docs/quick-design-svg/).
