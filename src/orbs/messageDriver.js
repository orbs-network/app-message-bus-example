/**
 * Copyright 2020 the orbs authors
 * This file is part of the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */
const { readFileSync, readdirSync } = require("fs");
const { join } = require("path");
const OrbsClientSdk = require("orbs-client-sdk");

const RESULT_UNKNOWN = -1,
 RESULT_SUCCESS = 0,
 RESULT_COMPLETED_NOT_SUCCESS = 1,
 RESULT_PENDING = 2,
 RESULT_FAILED = 3;

class MessageDriver {
    static get ResultUnknown() {return RESULT_UNKNOWN;}
    static get ResultSuccess() {return RESULT_SUCCESS;}
    static get ResultContractInternalError() {return RESULT_COMPLETED_NOT_SUCCESS;}
    static get ResultPending() {return RESULT_PENDING;}
    static get ResultFailed() {return RESULT_FAILED;}
    constructor(orbsEndpoint, vChainId, contractName, methodName, eventName) {
        if (!orbsEndpoint) {
            throw new Error("missing orbs endpoint url");
        }
        if (!vChainId) {
            throw new Error("missing orbs virtual chain id");
        }
        if (!contractName) {
            throw new Error("missing orbs deployed contract name");
        }

        this.contractName = contractName;
        this.methodName = methodName;
        this.eventName = eventName;
        this.contractNameLower = this.contractName.toLowerCase();
        this.methodNameLower = this.methodName.toLowerCase();
        this.eventNameLower = this.eventName.toLowerCase();
        this.signer = OrbsClientSdk.createAccount();
        this.client = new OrbsClientSdk.Client(orbsEndpoint, vChainId, OrbsClientSdk.NetworkType.NETWORK_TYPE_MAIN_NET, new OrbsClientSdk.LocalSigner(this.signer));
        this.helpers = OrbsClientSdk;
        this.endpoint = orbsEndpoint;
    }

     _getContractCode() {
        return readdirSync(__dirname).filter(f => f.match(/\.go$/) && !f.match(/\_test.go$/)).map(f => {
            return readFileSync(join(__dirname, f));
        });
    }

    async deploy() {
        const [tx, txId] = await this.client.createDeployTransaction(this.contractName, OrbsClientSdk.PROCESSOR_TYPE_NATIVE, ...this._getContractCode());
        const result = await this.client.sendTransaction(tx);
        if (result.executionResult !== 'SUCCESS') {
            throw new Error(result.outputArguments[0].value);
        }
        return Number(result.blockHeight);
    }

    // TODO reduction of codes ?
    async message(data) {
        const [tx, txId] = await this.client.createTransaction(this.contractName, this.methodName, [this._jsonObjectToByteArray(data)]);
        const result = await this.client.sendTransaction(tx);
        let code = MessageDriver.ResultUnknown;
        if (result.requestStatus === "COMPLETED") {
            if (result.executionResult === "SUCCESS") {
                code = MessageDriver.ResultSuccess;
            } else {
                code = MessageDriver.ResultContractInternalError;
            }
        } else if (result.requestStatus === "IN_PROCESS" && result.executionResult === "NOT_EXECUTED" && result.transactionStatus === "PENDING") {
            code = MessageDriver.ResultPending;
        } else {
            code = MessageDriver.ResultFailed;
        }
        return {code: code, blockHeight: Number(result.blockHeight), txId: txId};
    }

    async getBlock(blockHeight) {
        const blockResponse = await this.client.getBlock(BigInt(blockHeight));
        if (blockResponse.requestStatus === 'NOT_FOUND') {
            return null;
        }
        return blockResponse;
    }

    filterEvents(transactions) {
        let res = [];
        for (let i = 0;i < transactions.length;i++) {
            const tx = transactions[i];
            if (tx.contractName.toLowerCase() === this.contractNameLower && tx.methodName.toLowerCase() === this.methodNameLower) {
                for (let j = 0;j < tx.outputEvents.length;j++) {
                    let event = tx.outputEvents[j];
                    if (event.eventName.toLowerCase() === this.eventNameLower) {
                        res.push({
                            "txIndex": i,
                            "txTime" : tx.timestamp,
                            "txId" : this._bytesToHex(tx.txId),
                            "txMessage" : this._byteArrayToJsonObject(event.arguments[0].value),
                        });
                    }
                }
            }
        }
        return res;
    }

    // helpers
    _jsonObjectToByteArray(data) {
        return this.helpers.argBytes(new TextEncoder("utf-8").encode(JSON.stringify(data)));
    }

    _byteArrayToJsonObject(data) {
        let text = new TextDecoder("utf-8").decode(data);
        try {
            return JSON.parse(text);
        } catch (e) {
            return {msg: text}; // TODO maybe throw error ?
        }
    }

    _bytesToHex(bytes) {
        return '0x' + bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
    }
}

module.exports = MessageDriver;
