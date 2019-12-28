# log4browser

This is a log tool for usage in browser.

Dont like Java, we lack good log tool in browser environment, which can help use to trace error and problems more efficiently.

So this is what log4browser try to do.

Welcome to develop together or pose an issue.

## Installation

```shell script
npm install log4browser
```

## Usage
```javascript
// create instance
var logger = new Logger();
// set up log config,
// then logger will work automatically
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