Easy to use rest client for JavaScript

# quick example
if you want to connect to
```
https://example.com/api/person?id=1
```
you type
```js
//init
import InlineRestClient from 'inline-rest-client'
var apiConnection = new InlineRestClient({url:'https://example.com/api'});

//use
apiConnection.person({id:1}).then(data=>console.log(data))

//other use
var data=await apiConnection.person({id:1})
console.log(data);
```

# Browser support
it depends of Proxy https://caniuse.com/#feat=proxy and Promises https://caniuse.com/#feat=promises
