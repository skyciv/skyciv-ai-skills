---
id: quick-design-advanced
title: Requiring Files
noIndex: true
---

In the Quick Design Calculator, you can import files from both the json and utils directories into calculate.js. This encourages code reusability and helps maintain large calculation packs. The required folder structure is shown in the image below.

<img src="/api/v3/img/qd/qd-files.png"/>

### Requiring JSON Files

In the Quick Design Calculator, you can import files from both the json and utils directories into calculate.js. This encourages code reusability and helps maintain large calculation packs.

Files in the json directory must have the .json extension. These files can be required in calculate.js using the global `requireJSON(filename)` function.

The required folder structure is shown in the image below.

#### Import Example

```js
// Returns JSON data
const data = requireJSON('data.json');
```

### Requiring JavaScript Files

Files in the utils directory must have a .js extension. They can be required in calculate.js using the global requireUtil(filename) function. To be executable in calculate.js, they must export functions using module.exports.


#### Export Example

```js
module.exports = {
	'foo': function (bar) {
		return bar.toLowerCase();
	}
}
```

#### Import Example 

```js
const utils = requireUtil('util.js');
const res = utils.foo("TEST") // returns test
```

##### Mutliple Directories 

```js
const nested_utils = requireUtil('/bar/util.js');
const res = nested_utils.foo("TEST") // returns test
```

### Requiring CSV Files

Files in the csv directory must have the .csv extension. These files can be required in calculate.js using the global `requireCSV(filename)` function. The returned CSV string can then be parsed using the `CSV` helper functions.

#### Import Example

```js
const csv = requireCSV('test.csv');

// Parse into a flat array of objects
const data = CSV.csvToJSON(csv, true);

// Parse into a nested object using the first 3 columns as selector keys
const data2 = CSV.csvToNestedJSON(csv, true, 3, ",", false);
