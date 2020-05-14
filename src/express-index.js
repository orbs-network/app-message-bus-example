/**\n'+
 ' * Copyright 2020 the orbs authors\n'+
 ' * This file is part of the Orbs project.\n'+
 ' *\n'+
 ' * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.\n'+
 ' * The above notice should be included in all copies or substantial portions of the software.\n'+
 ' */
'use strict';

const express = require("express");
const cors = require('cors');
const bodyParser = require('body-parser');

module.exports = function (config, envOverride) {
    const app = express();

//    const env = envOverride || process.env.NODE_ENV || 'local';

//    app.set('env', env);
    app.set('port', process.env.PORT || 3001);

    // http-server setup
    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));


    // let cors = config.get('cors');
    // if (cors['disable-pb-express-headers'] !== true) {
    //     // Concat and join allowed headers.
    //     let allowHeaders = [
    //         'Accept',
    //         'Authorization',
    //         'Content-Type'
    //     ];
    //
    //     if (cors.allowHeaders !== null) {
    //         allowHeaders = allowHeaders.concat(cors.allowHeaders);
    //     }
    //
    //     //AJAX calls should be allowed from all domains
    //     app.use(function (request, response, next) {
    //         response.header('Access-Control-Allow-Origin', '*');
    //         response.header('Access-Control-Allow-Headers', allowHeaders.join(', '));
    //         response.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    //         response.header('Access-Control-Max-Age', '600');
    //         return next();
    //     });
    // }

    // This header is set by nginx when proxy'ing requests
    app.use(function (request, response, next) {
        request.forwardedSecure = (request.headers['x-forwarded-proto'] === 'https');
        return next();
    });

    app.get('/health-check', healthCheck);
    app.get('/', healthCheck);

    // app.use((err, req, res, next) => {
    //     winston.error(`Error at API call(${req.originalUrl}): ${err}`);
    //     next(err);
    // });

    function healthCheck (request, response) {
        let serviceName = require(__dirname + 'package.json').name;
        let serviceVersion = require(__dirname + 'package.json').version;
        response.serverOk({env: env, service: serviceName, version: serviceVersion});

    }

    express.response.serverOk = function (resultJson) {
        if(resultJson) {
            this.status(200).json(resultJson);
        } else {
            this.status(200).send();
        }
    };

    express.response.serverError = function (code, msg) {
        let niceMsg = {errors:[{status : code, message : msg instanceof Error ? msg.message : msg}]};
        this.status(code).send(niceMsg);
    };

    app.disable('x-powered-by');

    return app;
};
