const dotenv = require('dotenv').config();
const log = console.log;
const http = require('http');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const server = http.createServer;
const {logEvents} = require('./logEvents');
const EventsEmitter = require('events');
class Emitter extends EventsEmitter { };
// INITIALIZE
const myEmitter = new Emitter();
myEmitter.on('log', (msg, fileName) => { logEvents(msg, fileName) });
const HOST = process.env.HOST;
const PORT = process.env.PORT;
const serveFile = async (filePath, contentType, response) => {
    try {
        const rawData = await fsPromises.readFile(
            filePath,
            !contentType.includes('image') ? 'utf8' : ""
        );
        const data = contentType === 'application/json' ? JSON.parse(rawData) : rawData;
        response.writeHead(
            filePath.includes('404.html') ? 404 : 200,
            { 'Content-type': contentType }
        );
        response.end(
            contentType === 'application/json' ? JSON.stringify(data) : data
        );
    } catch (err) {
        console.error(err);
        myEmitter.emit('log', `${err.name}\t${err.message}`, 'error_log.txt');
        response.statusCode = 500;
        response.end();
    }
}
server((req, res) => {
    log(req.url, req.method);
    myEmitter.emit('log', `${req.url}\t${req.method}`, 'request_log.txt');
    // CHECK CONTENT TYPE
    const extension = path.extname(req.url);
    let contentType;
    switch (extension) {
        case '.css':
            contentType = 'text/css;'
            break;
        case '.js' :
            contentType = 'text/javascript';
            break;
        case '.json' :
            contentType = 'application/json';
            break;
        case '.jpg' :
            contentType = 'image/jpeg';
            break;
        case '.png' :
            contentType = 'image/png';
            break;
        case '.txt' :
            contentType = 'text/plain';
            break;
        default: 
            contentType = 'text/html';
    }
    // CHECK PATH
    let filePath;
    if (contentType === 'text/html' && req.url === '/') {
        filePath = path.join(__dirname, 'views', 'index.html');
    } else if (contentType === 'text/html' && req.url.slice(-1) === '/') {
        filePath = path.join(__dirname, 'views', req.url, 'index.html');
    } else if (contentType === 'text/html') {
        filePath = path.join(__dirname, 'views', req.url);
    } else {
        filePath = path.join(__dirname, req.url);
    }
    // SERVE PAGE WITHOUT REQUIRING THE .html EXTENSION
    if (!extension && req.url.slice(-1) !== '/') {
        filePath += '.html';
    }
    const fileExists = fs.existsSync(filePath);
    if (fileExists) {
        serveFile(filePath, contentType, res);
    } else {
        switch (path.parse(filePath).base) {
            case 'old-page.html':
                res.writeHead(301, { 'Location': '/new-page.html' });
                res.end();
                break;
            case 'www-page.html':
                res.writeHead(301, { 'Location': '/' });
                res.end();
                break;
                default:
                    // 404 RESPONSE
                    serveFile(path.join(__dirname, 'views', '404.html'), 'text/html', res);
        }
    }
}).listen(PORT, () => log(`Server running on host:${HOST}:${PORT}`));


