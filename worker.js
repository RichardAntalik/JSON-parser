importScripts("parser.js");

var parser = new Parser();

onmessage = function (oEvent) {
    var msg = {};
    msg = JSON.parse(oEvent.data);

    switch (msg.action) {
        case "parse":
            jsonImage = parser.parseJson(msg.data);
            msg.data = jsonImage;
            msg.oneshot = parser.oneshot;
            postMessage(JSON.stringify(msg));
            break;
        case "prettify":
            msg.data = parser.prettify(msg.data);
            msg.oneshot = parser.oneshot;
            postMessage(JSON.stringify(msg));

            break;
        case "minify":
            msg.data = parser.minify(msg.data);
            msg.oneshot = parser.oneshot;
            postMessage(JSON.stringify(msg));
            break;
    }
};
