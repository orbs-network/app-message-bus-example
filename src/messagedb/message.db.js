/**
 * Copyright 2020 the orbs authors
 * This file is part of the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */

'use strict';

const MongoClient = require('mongodb').MongoClient;

const MongoMessageCollection = "CollectedMessages";
const MongoBlockChainInfoCollection = "BlockChainConfig";

class MessageDb {
  constructor(connectionUrl, dbName, defaultStartBlockHeight) {
    this.MongoClient = MongoClient;
    this.connectionUrl = connectionUrl;
    this.dbName = dbName;
    this.defaultStartBlockHeight = defaultStartBlockHeight;
  }

  async connect() {
    this.client = await this.MongoClient.connect(this.connectionUrl, {
//    sslValidate: true,
      //   sslCA:ca,
      useNewUrlParser: true, useUnifiedTopology: true
    });
    // try {
    //   await this.client.db(this.dbName).createCollection(MongoMessageCollection);
    //   // todo create index ?
    // } catch (e) {
    //   console.log('payload err ' + e.message);
    // }
    this.payloadsCollection = this.client.db(this.dbName).collection(MongoMessageCollection);
    this.orbsInfoColleciton = this.client.db(this.dbName).collection(MongoBlockChainInfoCollection);
  }

  async destroy() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  async postMessages(payloads, currentBlockHeight) {
    // todo session ?
    await this.payloadsCollection.insertMany(payloads);
    await this.orbsInfoColleciton.updateOne({_id: 1}, { $set: {currentBlockHeight}}, { upsert: true })
  }

  async getCurrentBlockHeight() {
    const result = await this.orbsInfoColleciton.findOne({ _id: 1 });
    if (result && result.currentBlockHeight !== undefined) {
      return result.currentBlockHeight;
    }
    return this.defaultStartBlockHeight;
  }

  async getAllMessages() {
    let results = await this.payloadsCollection.find({});
    return results.toArray();
  }

  async clearAll() {
    try {
      await this.payloadsCollection.drop();
    } catch (e) {/* don't care */}
    try {
      await this.orbsInfoColleciton.drop();
    } catch (e) {/* don't care */}
  }
}

module.exports = MessageDb;
