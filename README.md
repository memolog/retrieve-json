# Retrive JSON Data from file

Retrive JSON Data from required file (and replace with it)

```
npm install -g retrieve-json
```

## Example

input.js

```
const config = require('data.json');
```

data.json

```
{
  "foo": "bar"
}
```

```
retrieve-json -i input.js -o output.js
```

output.js

```
const config = {
  'foo': 'bar'
}
```
