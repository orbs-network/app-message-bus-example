/**
 * Copyright 2020 the orbs authors
 * This file is part of the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */

'use strict';

const mongoose = require('mongoose');

class MessageDb {
  constructor(connectionUrl, defaultStartBlockHeight) {
    this.connectionUrl = connectionUrl;
    this.defaultStartBlockHeight = defaultStartBlockHeight;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      mongoose.connection.once('error', reject);

      mongoose
          .connect(this.connectionUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
          .then(db => {
            mongoose.connection.removeListener('error', reject);
            this.db = db;

            // model
            this.PayloadModel = mongoose.model('Payloads', PayloadSchema);
            this.BlockchainModel = mongoose.model('BlockChainInfo', BlockChainSchema);
            resolve();
          });
    });
  }

  async destroy() {
    if (this.db) {
      await this.db.disconnect();
      this.db = null;
    }
  }

  async postMessages(payload, currentBlockHeight) {
    // todo session ?
    const payloadInstance = new this.PayloadModel(payload);
    await payloadInstance.save();
    await this.BlockchainModel.updateOne({_id: 1}, { $set: {currentBlockHeight}}, { upsert: true })
  }

  async getCurrentBlockHeight() {
    const result = await this.BlockchainModel.findOne({ _id: 1 });
    if (result && result.currentBlockHeight !== undefined) {
      return result.currentBlockHeight;
    }
    return this.defaultStartBlockHeight;
  }

  async getAllMessages() {
    let results = await this.PayloadModel.find({});
    return results;
  }

  async clearAll(db) {
    await this.PayloadModel.deleteMany({});
  }
}

const validateEventType = /^HRTB_S|NoGW|NoTx|NoTag$/;
const validateEventTypeErrMessage = '{VALUE} is not a valid eventType!';

let PayloadSchema = new mongoose.Schema({
//  messageId : { type: Number, required: true, trim: true, index: true, unique: true, match: [validateGuidRegex, validateGuidErrMessage]},
//  messageTime : { type: Date, required: true },
  TagID : { type: String, required: true, trim: true },
  Latitude : { type: String, required: true, trim: true },
  Longitude : { type: String, required: true, trim: true },
  GatewayID : { type: String, required: true, trim: true },
  EventType : { type: String, required: true, trim: true, match: [validateEventType, validateEventTypeErrMessage]},
  EventValue : { type: String, required: true, trim: true },
}, {timestamps: true, autoIndex: false}); /* first time you run on a new DB must remove the auto index to create the index*/
PayloadSchema.virtual('messageId').get(function() { return this._id; });

let BlockChainSchema = new mongoose.Schema({
  _id: Number,
  currentBlockHeight: Number,
}, {timestamps: true, autoIndex: false});

//const fs = require('fs');

//const ca = [fs.readFileSync("./rds-combined-ca-bundle.pem")];

module.exports = MessageDb;
