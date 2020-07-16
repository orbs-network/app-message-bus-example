# Orbs Message Bus Example

## The application has 4 components

### 1) Orbs
* messageContract.go - An example of very simple orbs smart contract. 
* messageDriver.js - An example of exposing needed functionality for the server. Please Note, the driver has 
code to deploy the contract to Orbs, this is mostly for the test suite. It is usually not a good idea to deploy
contract to Orbs as part of the regular server activity.

### 2) DB(s)

#### MessageDB
This database holds a copy of the messages from the blockchain. It is meant to be source of data to 
the "receiver" end of the bus for further manipulation (BI, tracking etc). In the default example we
use pure MongoDB as it is a document databse with no schema.

#### ItemDB
Optionally one might want to manipulate the data that is saved in the blockchain. For example encryption or anonymization.
The ItemDB holds data that is 'saved' on the gateway (entry) side of the message bus, and can be used to decrypt or 
de-anonymize the data by the collector (exit) side.

### 3) Gateway server
The gateway server is the entry point to the Orbs Blockchain. It exposes a ```/sendMessage``` url for posts, 
and sends the json object as a payload to the blockchain (in example up to two different Orbs instances). 

This is the place where you can manipulate, clean, verify, anonymize and encrypt the payload before
sending it to the public blockchain.

### 4) Collector server
The collector server is an infinite loop that tries to read from the blockchain to find the relevant
messages. Each message is saved to a message DB (there are multiple examples - default is mongo db).
Externally it exposes ```/current-block-height``` to allow monitoring. In the example if save fails the 
server tries reading again and again for ever.

This is the place where you can verify, de-anonymize and decrypt the payload before
sending it to the messageDB and rest of your system.

## Running on Heroku 
Running on Heroku is a simple way to run a server. Please read [here](https://devcenter.heroku.com/articles/git)
for instructions how to deploy to Heroku.
 
The repository already inclues a ```.slugignore``` file which is needed to avoid Heroku 
compiling the golang Orbs smart contract (this will also make it impossible to use the 
messageDriver to deploy a contract from a running server on Heroku). It also inclues an 
```app.json``` file as an example descriptor.

### Multi Procfile.
If you plan to run both gateway and collector on Heroku from one repository you will need to apply [Multi Procfile](https://elements.heroku.com/buildpacks/heroku/heroku-buildpack-multi-procfile).
You need to open two instances on Heroku and allow each Heroku server to run the correct node command.

## Deploying with Docker

### Building Docker image

```bash
./docker-build.sh # build the image
docker push orbsnetwork/message-bus # push the image
```

### Configuration

1. Create `.env.production.collector` file with all relevant configuration options **for the collector**

2. Create `.env.production.gateway` file with all relevant configuration options **for the gateway**

### Running locally

```bash
docker-compose up
```

To clean up docker:

```bash
docker rm -f $(docker ps -aq) && docker volume rm $(docker volume ls -q)
```

### Running on ECS

```bash
ecs-cli configure --cluster collector-staging --region us-east-2

ecs-cli compose up
```