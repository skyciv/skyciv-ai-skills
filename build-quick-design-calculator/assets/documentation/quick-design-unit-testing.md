---
id: quick-design-unit-testing
title: Quick Design Unit Testing
noIndex: true
---

If you want to add unit tests to your calculation functions in Quick Design then this can be easily done with [Jest](https://jestjs.io/). Jest is simple to set up and run. 

To do this in Quick Design it is best to abstract your calculation functions into a separate js file in your utils folder of your calc pack. Even if you don't want to unit test this is a good idea as it promotes better organization of your code which can improve:

- Modularity 🙂
- Reusability 🙂🙂
- Readability 🙂🙂🙂
- Maintainability 🙂🙂🙂🙂

You can find a sample of how to write unit tests in ```./unit_tests/eng_calcs/test.js```
This file tests ```utils/eng_calcs.js```

## Setting up Unit Tests

### Step 1: Install Jest

```npm install --save-dev jest```

### Setup NPM Script

Add this to your package.json scripts section

```js
"scripts": {
    "test": "jest"
}
```

If you already have a scripts section just add:

``` "test": "jest" ```

### Step 2: Write your tests

Start writing your unit tests. 
You can have as many files to do this as you want. 
These files should all end in the extension ```.test.js```

Import your calculations file into the relevant ```.test.js``` file

```const engCalcs = require('../utils/eng_calcs');```

Generally each test is an assertion that a given input should equal a given output, i.e. 

```js 
test('Addition of 2 numbers', () => {
    expect(engCalcs.addTwoNumbers(1, 2)).toBe(3);
});
```

There are different ways to test than using toBe, you can find them by reading the [docs here](https://jestjs.io/docs/using-matchers);

***Grouping Tests***

```js
describe('Addition Functions', () => {
    test('Addition of 2 numbers', () => {
        expect(engCalcs.addTwoNumbers(1, 2)).toBe(3);
 });
    test('Addtion of a positive and negative number', () => {
        expect(engCalcs.addTwoNumbers(1, -2)).toBe(-1);
 });
});
```

You can group tests with the describe function.

### Step 3: Run your tests

Run this in your terminal, if everything is set up correctly it should find and run your tests.

```
npm run tests
```

## Writing Quality Tests

1) Check expected behavior (i.e. we know 1 + 2 should always equal 3).
2) Check more complex behaviors (i.e. we want our module to handle negative numbers so we test that 1 + -3 = -2).
3) Test boundary conditions (i.e We know we cannot handle division by 0 so what should 1 / 0 return?). 

***Other things to check?***

- Large numbers
- Input type validation 

At the end of the day, unit tests are only useful if your underlying assumptions and expected results are correct. 
Passing unit tests doesn't mean that your calculations are correct and valid from an engineering standpoint if you have got the formula, check, or process wrong from the start. Unit tests are here to help you ensure you cover boundary cases, encourage better code modularity, and check edge cases. 

## Example QD Unit Test Repo

[Explore the Sample QD Unit Test Repo](https://bitbucket.org/skyciv/unit_tests/src/main/)