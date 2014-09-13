importScripts("parser.js");
var parser = new Parser(),
    jsonImage = {},
    minified = "",
    prettified = "";

onmessage = function (oEvent) {
    var msg = {};
    msg = JSON.parse(oEvent.data);

    switch (msg.action) {
        case "parse":
            jsonImage = parser.parseJson(msg.data);
            msg.data = jsonImage;
            postMessage(JSON.stringify(msg));
            break;
        case "prettify":
            msg.data = parser.prettify(msg.data);
            postMessage(JSON.stringify(msg));
            break;
        case "minify":
            msg.data = parser.minify(msg.data);
            postMessage(JSON.stringify(msg));
            break;
    }
};
