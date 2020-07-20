const pgp = require('pg-promise')({
    // Initialization Options
});

const { map } = require("lodash");

const DB_CONFIG_TABLE_NAME = 'config';
const DB_CONFIG_COLUMN_BLOCK_HEIGHT_NAME = 'last_collected_block_height';
const DB_EVENTS_TABLE_NAME = 'events';
const DB_EVENTS_PAYLOAD_NAME = 'payload';
const ORBS_START_BLOCK_HEIGHT = process.env.ORBS_START_BLOCK_HEIGHT || 1;

class MessageDb {
    constructor(connectionUrl, startBlockHeight) {
        this.connectionUrl = connectionUrl;
        this.startBlockHeight = startBlockHeight || ORBS_START_BLOCK_HEIGHT;
    }

    async connect() {
        this.db = pgp(this.connectionUrl);

        await this.createTables();
    }

    async destroy() {
        if (this.db) {
            await this.db.$pool.end();
            this.db = null;
        }
    }

    async createTables() {
        await this.db.none("CREATE TABLE IF NOT EXISTS $1~ (event_id SERIAL PRIMARY KEY, txid TEXT, blockheight INTEGER, blocktxindex INTEGER, blocktime TEXT, payload jsonb)", 
            [DB_EVENTS_TABLE_NAME]);
        // FIXME create index

        await this.db.none("CREATE TABLE IF NOT EXISTS $1~ ($2~ INTEGER)", [DB_CONFIG_TABLE_NAME, DB_CONFIG_COLUMN_BLOCK_HEIGHT_NAME]);

        try {
            await this.getCurrentBlockHeight();
        } catch (e) {
            console.log("Writing default config value");
            await this._setDefaultBlockHeight(this.startBlockHeight);
        }
    }

    _writeEventInTransaction(t, blockHeight, event) {
        return t.none("INSERT INTO ${table:raw} (blockheight, blocktxindex, blocktime, txid, payload) values (${blockHeight}, ${event.txIndex}, ${event.txTime}, ${event.txId}, ${event.txMessage}) on conflict do nothing",
            {
                table: DB_EVENTS_TABLE_NAME,
                blockHeight,
                event
            });
    }

    async getAllMessages() {
        const result = await this.db.manyOrNone('SELECT $1~ FROM $2~', [DB_EVENTS_PAYLOAD_NAME, DB_EVENTS_TABLE_NAME]);
        return map(result, DB_EVENTS_PAYLOAD_NAME);
    }

    deleteAllEvents() {
        return this.db.none("DELETE FROM $1~", [DB_EVENTS_TABLE_NAME]);
    }

    _writeBlockHeightInTransaction(t , blockHeight) {
        return t.none('UPDATE $1~ SET $2~ = $3', [DB_CONFIG_TABLE_NAME, DB_CONFIG_COLUMN_BLOCK_HEIGHT_NAME, blockHeight]);
    }

    _setDefaultBlockHeight(blockHeight) {
        return this.db.none('INSERT INTO $1~ ($2~) values ($3)', [DB_CONFIG_TABLE_NAME, DB_CONFIG_COLUMN_BLOCK_HEIGHT_NAME, blockHeight]);
    }

    async getCurrentBlockHeight() {
        const result = await this.db.one('SELECT $1~ FROM $2~ limit 1', [DB_CONFIG_COLUMN_BLOCK_HEIGHT_NAME, DB_CONFIG_TABLE_NAME]);
        return result[DB_CONFIG_COLUMN_BLOCK_HEIGHT_NAME];
    }

    postMessages(events, blockHeight, identites) {
        return this.db.tx(t => {
            let batch = [this._writeBlockHeightInTransaction(t, blockHeight)];
            for (let i = 0; i < events.length; i++){
                batch.push(this._writeEventInTransaction(t, blockHeight, events[i]));
            }

            if (identites) {
                for (let i = 0; i < identites.length; i++){
                    batch.push(this._writeIdentityInTransaction(t, identites[i]));
                }
            }

            return t.batch(batch);
        })
    }

    async clearAll() {
        await this.db.none("DROP TABLE $1~", [DB_EVENTS_TABLE_NAME]);
        await this.db.none("DROP TABLE $1~", [DB_CONFIG_TABLE_NAME]);
    }
}

module.exports = MessageDb;
