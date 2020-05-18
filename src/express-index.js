/**
 * Copyright 2020 the orbs authors
 * This file is part of the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */
'use strict';

const express = require("express");
const cors = require('cors');
const bodyParser = require('body-parser');

module.exports = function (serverName, port, envOverride) {
    const app = express();

    const env = envOverride || process.env.NODE_ENV || 'local';

    app.set('env', env);
    app.set('port', port);

    // http-server setup
    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));

    // This header is set by nginx when proxy'ing requests
    app.use(function (request, response, next) {
        request.forwardedSecure = (request.headers['x-forwarded-proto'] === 'https');
        return next();
    });

    app.get('/health-check', healthCheck);
    app.get('/', healthCheck);

    function healthCheck (request, response) {
        let serviceName = require(__dirname + '/package.json').name;
        let serviceVersion = require(__dirname + '/package.json').version;
        response.serverOk({env: env, service: serviceName + '-' + serverName, version: serviceVersion});
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
