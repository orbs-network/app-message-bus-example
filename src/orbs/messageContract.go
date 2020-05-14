/**
 * Copyright 2020 the orbs authors
 * This file is part of the Orbs project.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.
 * The above notice should be included in all copies or substantial portions of the software.
 */
package main

import (
	"github.com/orbs-network/orbs-contract-sdk/go/sdk/v1"
	"github.com/orbs-network/orbs-contract-sdk/go/sdk/v1/events"
)

var PUBLIC = sdk.Export(message)
var SYSTEM = sdk.Export(_init)
var EVENTS = sdk.Export(Message)

func _init() {}

func message(data []byte) {
	events.EmitEvent(Message, data)
}

func Message(data []byte) {}
