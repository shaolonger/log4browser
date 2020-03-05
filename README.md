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
// 1.create instance
var log4browser = require("log4browser");
var logger = new log4browser();

// 2.init with your own config
var config = {
    projectUid: '',
    captureJsError: true,
    captureResourceError: true,
    captureAjaxError: true,
    captureConsoleError: false,
    isAutoHandle: true, // if true, logger will call errorHandler automatically
    errorHandler: function (logData) {
        // something to do with logData
    }
};
logger.init(config);

// 3.(optional)switch errorHandler automation
logger.setIsAutoHandle(false); // stop
logger.setIsAutoHandle(true); // restart
```

## License
Log4browser is under the MIT License.