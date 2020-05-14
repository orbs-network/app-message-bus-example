const pgp = require('pg-promise')({
    // Initialization Options
});

// db
// const dbConfig = {
//     "host": "png-db.c02xf2sqqy7y.us-west-2.rds.amazonaws.com", // process.env.DB_HOST
//     "port": 5432, //  process.env.DB_PORT
//     "database": "collector", // process.env.DB_DATABASE
//     "user": "postgres",  // process.env.DB_USER
//     "password": "7d74d523-5edf-11ea-b8b0-8c8590a57c55"  // process.env.DB_PASSWORD
// };
const dbConnectionStr = process.env.DB_CONNECTION || "postgres://postgres:7d74d523-5edf-11ea-b8b0-8c8590a57c55@png-db.c02xf2sqqy7y.us-west-2.rds.amazonaws.com:5432/collector";
const db = pgp(dbConnectionStr);

const DB_CONFIG_TABLE_NAME = 'config';
const DB_CONFIG_COLUMN_BLOCK_HEIGHT_NAME = 'last_collected_block_height';
const DB_EVENTS_TABLE_NAME = 'events';
const DB_EVENTS_PAYLOAD_NAME = 'payload';

class MessageDb {
    constructor(connectionUrl) {
        this.connectionUrl = connectionUrl;
    }

    async connect() {
        this.db = pgp(this.connectionUrl);
    }

    async destroy() {
        if (this.db) {
            await this.db.$pool.end();
            this.db = null;
        }
    }

    _writeEventInTransaction(t, event) {
        return t.none('INSERT INTO events (blockheight, blocktxindex, blocktime, txid, payload) values (${blockheight}, ${blocktxindex}, ${blocktime}, ${txid}, ${payload}) on conflict do nothing',
            event);
    }

    readAllEvents() {
        return this.db.manyOrNone('SELECT $1~ FROM $2~', [DB_EVENTS_PAYLOAD_NAME, DB_EVENTS_TABLE_NAME]);
    }

    deleteAllEvents() {
        return this.db.none('DELETE FROM events');
    }

    _writeBlockHeightInTransaction(t , blockHeight) {
        return t.none('UPDATE $1~ SET $2~ = $3', [DB_CONFIG_TABLE_NAME, DB_CONFIG_COLUMN_BLOCK_HEIGHT_NAME, blockHeight]);
    }

    readBlockHeightFromDB() {
        return this.db.one('SELECT $1~ as height FROM config limit 1', DB_CONFIG_COLUMN_BLOCK_HEIGHT_NAME, DB_CONFIG_TABLE_NAME);
    }

    writeEventsAndHeight(events, blockHeight) {
        return this.db.tx(t => {
            let batch = [this._writeBlockHeightInTransaction(t, blockHeight)];
            for (let i = 0;i < events.length;i++){
                batch.push(this._writeEventInTransaction(t, events[i]));
            }
            return t.batch(batch);
        })
    }

}

module.exports = MessageDb;
