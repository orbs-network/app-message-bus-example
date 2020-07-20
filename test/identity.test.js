/**
 * Copyright 2020 the orbs authors
 * This file is part of the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */

'use strict';

const expect = require("expect.js");
const {describe, it, beforeEach, afterEach, after} = require('mocha');
const { uuid } = require("uuidv4");
const IdentityDb = require("../src/identitydb/identity.postgres.db");

const DummyUrl = 'postgres://root:example@localhost:5432/message';

describe("message db - postgres", () => {
    let db = new IdentityDb(DummyUrl);
    beforeEach(async () => {
        await db.connect();
    });
    afterEach(async () => {
        await db.clearAll();
        await db.destroy();
    });

    it("empty db save identities", async () => {
        const identities = [
            { uuid: uuid(), value: "hello"},
            { uuid: uuid(), value: "world"},
        ];
        await db.saveIdentities(identities);
        let res = await db.getAllIdentities();
        expect(res.length).to.equal(2);
        expect(res).to.eql(identities);
    });
});