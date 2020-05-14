/**
 * Copyright 2020 the orbs authors
 * This file is part of the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */
const generateExpressServer = require('../express-index');

class CollectorServer {
    constructor(listener, orbsConnection, messageDB) {
        this.listener = listener;
        this.orbsConnection = orbsConnection;
        this.messageDB = messageDB;
        this._running = false;
    }

    start() {
        this._running = true;
        this._internalLoop = new Promise(async (resolve, reject) => {
            try {
                let orbsLastReadBlockHeight = await this.messageDB.getCurrentBlockHeight() + 1;
                console.log(`starting at block ${orbsLastReadBlockHeight}`);

                do {
                    const block = await this.orbsConnection.getBlock(orbsLastReadBlockHeight);
                    if (block) {
                        let events = this.orbsConnection.filterEvents(block.transactions);
                        if (events.length > 0) {
                            try {
                                // TODO smart retries
                                await this.messageDB.postMessages(events, orbsLastReadBlockHeight);
                            } catch (e) {
                                console.error(`could not save to message db. error ${e.message}`);
                                continue;
                            }
                        }
                        if (orbsLastReadBlockHeight % 10 === 0) {
                            console.log(`block ${orbsLastReadBlockHeight} was read.`);
                        }
                        orbsLastReadBlockHeight++;
                    } else {
                        console.log("no new blocks, wait");
                        await sleep(100);
                    }
                } while (this._running);
                console.log("collector interrupted");
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }

    async close() {
        this._running = false;
        if (this._internalLoop) {await this._internalLoop;}
        if (this.listener) {await this.listener.close();}
    }
}

module.exports.serve = function serve(port, orbsConnection, messageDB) {
    const app = generateExpressServer();

    app.get("/current-block-height", async (request, response) => {
        try {
            response.json({"last-collected-block-height": await messageDB.getCurrentBlockHeight()});
        } catch (e) {
            response.json({"error": e.message})
        }
    });

    // listen for requests :)
    const listener = app.listen(port, (err) => {
        if (err) {
            console.error(`Error launching service : ${err}`);
            throw  err;
        } else {
            console.log("Collector Server is listening on port " + listener.address().port);
        }
    });

    return new CollectorServer(listener, orbsConnection, messageDB);
};

// general
function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}


