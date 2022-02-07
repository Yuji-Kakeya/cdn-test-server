const HTTP_PORT = 80;
const HTTPS_PORT = 443;

import { execSync } from "child_process";
import fs from "fs";
import express from "express";
import https from "https";
import auth from "basic-auth";
import path from "path";

const app = express();
app.listen(HTTP_PORT);
app.use(express.urlencoded({extended: true}));
app.use(express.json());

const options = {
  key:  fs.readFileSync(`${__dirname}/cert/server.key`),
  cert: fs.readFileSync(`${__dirname}/cert/server.crt`)
};
let server = https.createServer(options,app);
server.listen(HTTPS_PORT);

//Const
const PUBLIC = (`${__dirname}/pub`);
const HEADER_CACHE_CONTROL = "Cache-Control";
const HEADER_CACHE_CONTROL_FROM_ORIGIN = "Cache-Control-From-Origin";
const HEADER_LASTMODIFIED_FROM_ORIGIN = "Last-Modified-From-Origin";
const HEADER_ETAG_FROM_ORIGIN = "Etag-From-Origin";

//Functions
const isNum = (num: string | number) => num != "" && !isNaN(num as number);
const generateDynamicHTML = (req: string) => `<!DOCTYPE html><html lang="en"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"/><title>Dynamic</title></head><body>This page was generated at ${Date()} dynamically. This page should not be cached by CDN. ${req}</body></html>`;
const leftZeroPadding = (num: number) => String(num).replace(/^(\d)$/, "0$1");
const modifyLastUpdate = (req: { subYear: string, subMonth: string, subDate: string, subHours: string, subMinutes: string }, path: string) => {
    const currentDate = new Date();
    let modifiedDateArray: [number, number, number, number, number] = [
        currentDate.getFullYear() + Number(req.subYear),
        currentDate.getMonth() + Number(req.subMonth),
        currentDate.getDate() + Number(req.subDate),
        currentDate.getHours() + Number(req.subHours),
        currentDate.getMinutes() + Number(req.subMinutes),
    ];

    const modifiedDate = new Date(...modifiedDateArray);
    const modifiedDateString = `${modifiedDate.getFullYear()}${leftZeroPadding(modifiedDate.getMonth() + 1)}${leftZeroPadding(modifiedDate.getDate())}${leftZeroPadding(modifiedDate.getHours())}${leftZeroPadding(modifiedDate.getMinutes())}`;

    try {
        if (/^\d{12}$/.test(modifiedDateString) && /^\/[a-zA-Z0-9]+\.[a-zA-Z0-9]*$/.test(path)) {
            execSync(`touch -t ${modifiedDateString} ${PUBLIC}/${path}`);
            return modifiedDateString;
        } else {
            return "failed to modify last update. - parse error"
        }
    } catch (e) {
        return "failed to modify last update."
    }

}

const createHeaders = (req: any, path: string|null) => {
    let cacheControls = req.cacheability == "" ? [] : [req.cacheability];
    for (let key in req) {
        if (isNum(req[key]) && !/^sub/.test(key)) {
            cacheControls.push(`${key}=${req[key]}`);
        }
    }
    const cacheControl = cacheControls.join(", ");
    const isLastModified = req["last-modified"] == "true";
    const isEtag = req["etag"] == "true";
    const lastModifiedValue = (isLastModified && path != null) ? modifyLastUpdate(req, path) : "Notchange";

    return {
        lastModified: isLastModified,
        etag: isEtag,
        headers: {
            [HEADER_CACHE_CONTROL]: cacheControl,
            [HEADER_CACHE_CONTROL_FROM_ORIGIN]: cacheControl,
            [HEADER_LASTMODIFIED_FROM_ORIGIN]: lastModifiedValue,
            [HEADER_ETAG_FROM_ORIGIN]: isEtag
        }
    }
}

//Authentication
app.use((req, res, next) => {
    res.removeHeader("Cache-Control");
    if (req.query["auth"] == "true") {
        const user = auth(req);

        if (!user || user.name!=="test"|| user.pass !== "test" ) {
            res.set('WWW-Authenticate', 'Basic realm="example"');
            return res.status(401).send();
        }
    }
    return next();
});

//Express Routing
app.get("/", (_, res) => {
    res.sendFile(`${PUBLIC}/index.html`);
});

app.get("/sample*.*", (req, res) => {
    const options = createHeaders(req.query, req.path);
    res.contentType(path.extname(`${PUBLIC}${req.path}`));
    res.sendFile(`${PUBLIC}${req.path}`, options);
});

app.post("/sample*.*", (req, res) => {
    const options = createHeaders(req.body, req.path);
    res.contentType(path.extname(`${PUBLIC}${req.path}`));
    res.sendFile(`${PUBLIC}${req.path}`, options);
});

app.get("/dynamic.html", (req, res) => {
    const options = createHeaders(req.query, null);
    res.set(options);
    res.status(200).end(generateDynamicHTML(JSON.stringify(req.headers)));
});

app.get("/key", (req,res) => {
    res.sendFile(`${__dirname}/cert/server.key`);
});

app.post("/dynamic.html", (req, res) => {
    const options = createHeaders(req.body, null);
    res.set(options);
    res.status(200).end(generateDynamicHTML(JSON.stringify(req.headers)));
});

console.log(`Running HTTP Server on port ${HTTP_PORT}!`);
console.log(`Running HTTPS Server on port ${HTTPS_PORT}!`);