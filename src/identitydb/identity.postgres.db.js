const pgp = require('pg-promise')({
    // Initialization Options
});

const { map } = require("lodash");
const DB_IDENTITIES_TABLE_NAME = 'identities';

class IdentityDb {
    constructor(connectionUrl) {
        this.connectionUrl = connectionUrl;
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
        await this.db.none("CREATE TABLE IF NOT EXISTS $1~ (uuid CHAR(36), value TEXT)", [DB_IDENTITIES_TABLE_NAME]);

    }

    _writeIdentityInTransaction(t, identity) {
        return t.none("INSERT INTO ${table:raw} (uuid, value) values (${identity.uuid}, ${identity.value}) on conflict do nothing",
            {
                table: DB_IDENTITIES_TABLE_NAME,
                identity,
            });
    }

    async getAllIdentities() {
        return this.db.manyOrNone('SELECT * FROM $1~', [DB_IDENTITIES_TABLE_NAME]);
    }

    saveIdentities(identities) {
        return this.db.tx(t => {
            let batch = [];
            for (let i = 0; i < identities.length; i++){
                batch.push(this._writeIdentityInTransaction(t, identities[i]));
            }

            return t.batch(batch);
        })
    }

    async clearAll() {
        await this.db.none("DROP TABLE $1~", [DB_IDENTITIES_TABLE_NAME]);
    }
}

module.exports = IdentityDb;
