# log4browser

This is a simple log tool for usage in browser.

Dont like Java or the other language, we lack good log tool in browser environment, which can help us trace errors or problems more efficiently.

So this is what log4browser try to do.

Welcome to develop together or put an issue.

## Installation

```shell script
npm install log4browser
```

## Usage
```javascript
// create instance
var logger = new Logger();
// set up log config,
// then logger will work automatically by calling 'sendError'
var config = {
    captureJsError: true,
    captureResourceError: true,
    captureAjaxError: true,
    captureConsoleError: false,
    autoReport: true,
    sendError: function (logData) {
    }
};
```

## License
Log4browser is under the MIT License.