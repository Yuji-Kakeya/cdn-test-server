"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var HTTP_PORT = 80;
var HTTPS_PORT = 443;
var child_process_1 = require("child_process");
var fs_1 = __importDefault(require("fs"));
var express_1 = __importDefault(require("express"));
var https_1 = __importDefault(require("https"));
var basic_auth_1 = __importDefault(require("basic-auth"));
var path_1 = __importDefault(require("path"));
var app = (0, express_1.default)();
app.listen(HTTP_PORT);
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
var options = {
    key: fs_1.default.readFileSync(__dirname + "/cert/server.key"),
    cert: fs_1.default.readFileSync(__dirname + "/cert/server.crt")
};
var server = https_1.default.createServer(options, app);
server.listen(HTTPS_PORT);
//Const
var PUBLIC = (__dirname + "/pub");
var HEADER_CACHE_CONTROL = "Cache-Control";
var HEADER_CACHE_CONTROL_FROM_ORIGIN = "Cache-Control-From-Origin";
var HEADER_LASTMODIFIED_FROM_ORIGIN = "Last-Modified-From-Origin";
var HEADER_ETAG_FROM_ORIGIN = "Etag-From-Origin";
//Functions
var isNum = function (num) { return num != "" && !isNaN(num); };
var generateDynamicHTML = function () { return "<!DOCTYPE html><html lang=\"en\"><head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"/><title>Dynamic</title></head><body>This page was generated at " + Date() + " dynamically. This page should not be cached by CDN.</body></html>"; };
var leftZeroPadding = function (num) { return String(num).replace(/^(\d)$/, "0$1"); };
var modifyLastUpdate = function (req, path) {
    var currentDate = new Date();
    var modifiedDateArray = [
        currentDate.getFullYear() + Number(req.subYear),
        currentDate.getMonth() + Number(req.subMonth),
        currentDate.getDate() + Number(req.subDate),
        currentDate.getHours() + Number(req.subHours),
        currentDate.getMinutes() + Number(req.subMinutes),
    ];
    var modifiedDate = new (Date.bind.apply(Date, __spreadArray([void 0], modifiedDateArray, false)))();
    var modifiedDateString = "" + modifiedDate.getFullYear() + leftZeroPadding(modifiedDate.getMonth() + 1) + leftZeroPadding(modifiedDate.getDate()) + leftZeroPadding(modifiedDate.getHours()) + leftZeroPadding(modifiedDate.getMinutes());
    try {
        if (/^\d{12}$/.test(modifiedDateString) && /^\/[a-zA-Z0-9]+\.[a-zA-Z0-9]*$/.test(path)) {
            (0, child_process_1.execSync)("touch -t " + modifiedDateString + " " + PUBLIC + "/" + path);
            return modifiedDateString;
        }
        else {
            return "failed to modify last update. - parse error";
        }
    }
    catch (e) {
        return "failed to modify last update.";
    }
};
var createHeaders = function (req, path) {
    var _a;
    var cacheControls = req.cacheability == "" ? [] : [req.cacheability];
    for (var key in req) {
        if (isNum(req[key])) {
            cacheControls.push(key + "=" + req[key]);
        }
    }
    var cacheControl = cacheControls.join(", ");
    var isLastModified = req["last-modified"] == "true";
    var isEtag = req["etag"] == "true";
    var lastModifiedValue = (isLastModified && path != null) ? modifyLastUpdate(req, path) : "Notchange";
    return {
        lastModified: isLastModified,
        etag: isEtag,
        headers: (_a = {},
            _a[HEADER_CACHE_CONTROL] = cacheControl,
            _a[HEADER_CACHE_CONTROL_FROM_ORIGIN] = cacheControl,
            _a[HEADER_LASTMODIFIED_FROM_ORIGIN] = lastModifiedValue,
            _a[HEADER_ETAG_FROM_ORIGIN] = isEtag,
            _a)
    };
};
//Authentication
app.use(function (req, res, next) {
    res.removeHeader("Cache-Control");
    if (req.query["auth"] == "true") {
        var user = (0, basic_auth_1.default)(req);
        if (!user || user.name !== "test" || user.pass !== "test") {
            res.set('WWW-Authenticate', 'Basic realm="example"');
            return res.status(401).send();
        }
    }
    return next();
});
//Express Routing
app.get("/", function (_, res) {
    res.sendFile(PUBLIC + "/index.html");
});
app.get("/sample*.*", function (req, res) {
    var options = createHeaders(req.query, req.path);
    res.contentType(path_1.default.extname("" + PUBLIC + req.path));
    res.sendFile("" + PUBLIC + req.path, options);
});
app.post("/sample*.*", function (req, res) {
    var options = createHeaders(req.body, req.path);
    res.contentType(path_1.default.extname("" + PUBLIC + req.path));
    res.sendFile("" + PUBLIC + req.path, options);
});
app.get("/dynamic.html", function (req, res) {
    var options = createHeaders(req.query, null);
    res.set(options);
    res.status(200).end(generateDynamicHTML());
});
app.post("/dynamic.html", function (req, res) {
    var options = createHeaders(req.body, null);
    res.set(options);
    res.status(200).end(generateDynamicHTML());
});
console.log("Running HTTP Server on port " + HTTP_PORT + "!");
console.log("Running HTTPS Server on port " + HTTPS_PORT + "!");
