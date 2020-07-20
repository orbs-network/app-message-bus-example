/**
 * Copyright 2020 the orbs authors
 * This file is part of the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */

const generateExpressServer = require('../express-index');
const { isEmpty, includes, map, has } = require("lodash");
const { uuid } = require('uuidv4');
const MessageDb = require('../messagedb/message.postgres.db');

class GatewayServer {
  constructor(listener) {
    this.listener = listener;
  }

  close(callback) {
    if (this.listener) {this.listener.close(callback);}
  }
}

module.exports.serve = async function serve(port, orbsConnections, apiKeys, anonymousConfig) {
  const app = generateExpressServer('gateway', port);
  let db;
  const { fields, connectionUrl } = anonymousConfig;

  if (isEmpty(apiKeys)) {
    console.info(`No API keys configured, anyone will be able to send messages via gateway`);
  }

  if (isEmpty(fields)) {
    console.info(`No anonymous fields configured, everything will be recorded as is`);
  } else {
    db = new MessageDb(connectionUrl);
    await db.connect();
  }

  app.post("/sendMessage", async (request, response) => {
    let data = request.body;
    try {
      if (!isEmpty(apiKeys)) {
        const key = request.headers["x-auth"];
        if (!includes(apiKeys, key)) {
          console.error(`Wrong API key: ${key}`);
          response.status(403).json({ error: "Wrong API key" });
          return;
        }
      }

      let identities = [];
      map(fields, (field) => {
        if (has(data, field)) {
          const value = data[field];
          const id = uuid();
          data[field] = id;
          identities.push({ uuid: id, value });
        }
      });

      let txs = [];
      for (let i = 0; i < orbsConnections.length; i++) {
        txs.push(orbsConnections[i].message(data).then(resp => {
            return { connection: i, endpoint: orbsConnections[i].endpoint, response: resp };
        }));
      }
      let resp = await Promise.all(txs);
      response.json(resp);

      if (!isEmpty(identities) && db) {
        db.saveIdentities(identities).catch(console.error);
      }
    } catch (e) {
      console.error(e);
      response.json({error: e.message, stack: e.stack})
    }
  });

  // listen for requests :)
  const listener = app.listen(port, (err) => {
    if (err) {
      console.error(`Error launching service : ${err}`);
      throw  err;
    } else {
      console.log("Gateway Server is listening on port " + listener.address().port);
    }
  });

  return new GatewayServer(listener);
};
