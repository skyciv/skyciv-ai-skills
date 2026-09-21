---
id: quick-design-units
title: Handeling Unit Systems
noIndex: true
---

## Automatic Unit Conversion  

Quick Design includes built-in functionality for automatic unit conversion.  
To enable this feature, add the `default_unit_system` key to the `config.json` meta object.  

### Configuration  

| Key                   | Supported Values       |  
|-----------------------|------------------------|  
| `default_unit_system` | `metric` or `imperial` |  

The unit conversion system applies to all supported units, including superscript notations for squared and cubed units (e.g., mm² or mm³).  

### Standard Units  

To maintain consistency across Quick Design, use the following standard units whenever possible:  

| Quantity        | Metric Default Unit | Imperial Default Unit |  
|-----------------|--------------------|--------------------|  
| Length          | mm                 | in                 |  
|                 | cm                 | in                 |  
|                 | m                  | ft                 |  
| Force           | kN                 | kip                |  
| Moment          | kN-m               | kip-ft             |  
| Stress/Pressure | Pa                 | psi                |  
|                 | kPa                | psi                |  
|                 | MPa                | ksi                |  

:::tip  
Using the units in the table above ensures more reliable automatic unit conversion.  
For example, prefer `"kN-m"` over alternatives like `"kN.m"` or `"kn-m"`.  
:::  

### Overrides  

Use the following override options to customize the automatic unit conversion system:  

| Override Key        | Description                                                  |  
|-------------------- |------------------------------------------------------------- |  
| `convert_to`        | Specifies the default unit for the alternate unit system.    |  
| `converted_default` | Sets the default value for the alternate unit system.        |  
| `converted_step`    | Defines the default step size for the alternate unit system. |  

## Manual Unit Conversion  

If you need to report in both unit systems and require greater control over the unit system, manual unit conversion is recommended.  

To enable manual unit conversion, **do not include** the `default_unit_system` key in your `config.json`. Instead, create a folder for the alternate unit system (either `metric` or `imperial`), with its own `calculate.js` and `config.json` files, as shown in the screenshot below:

<center><img src="/api/v3/img/qd/manual_units.png" /></center>

In this system, both the `json` and `utils` directories are shared between the original and alternate unit Quick Design.  

The following files can be shared or unique to each unit system:

1. `ui.js`
2. `docs.md`
3. `renderer.js`


When using this system both the `json` and `utils` are shared between both the original and alternate unit Quick Design. 

The following files can be shared or unique to each unit system:

1) ui.js
2) docs.md
3) renderer.js
