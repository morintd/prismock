# Use with decimal.js

You won't be able to use `prismock` with [decimal.js](https://mikemcl.github.io/decimal.js/) with the default configuration.

Because `prismock` makes use of `structuredClone` which `decimal.js` doesn't support, you will encounter a `DataCloneError`, as pointed in [#937](https://github.com/morintd/prismock/issues/937).

[@badeleux](https://github.com/badeleux) provide a workaround in his [issue](https://github.com/morintd/prismock/issues/937#issuecomment-2140798122), which I recommend you setup in a [setupFilesAfterEnv](https://jestjs.io/docs/configuration#setupfilesafterenv-array).


```js
// Backup the original structuredClone function
const originalStructuredClone = structuredClone;

// Custom structuredClone that handles Decimal types
function customStructuredClone(input) {
    const replacer = (key, value) => {
        if (value instanceof Decimal) {
            // Convert Decimal to a serializable form
            return {type: 'Decimal', value: value.toString()};
        }
        return value;
    };

    const reviver = (key, value) => {
        if (value && value.type === 'Decimal') {
            // Convert back to Decimal
            return new Decimal(value.value);
        }
        return value;
    };

    // Use JSON stringify and parse as an example of handling custom types
    return originalStructuredClone(JSON.parse(JSON.stringify(input, replacer), reviver));
}

// Override global structuredClone with the custom function
global.structuredClone = customStructuredClone;
```
