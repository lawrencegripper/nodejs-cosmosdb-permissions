var restify = require('restify');
var documentClient = require("documentdb").DocumentClient;
var uuid = require('uuid');

//Create CosmosDB client
let client = new documentClient(process.env.COSMOS_ENDPOINT, { "masterKey": process.env.COSMOS_KEY });

//Setup the collection and db
let dbname = 'testdb'
let dbconfig = {
  "id": dbname
};
let databaseUrl = `dbs/${dbname}`;

//Cosmos objects, available once initialized. 
let collectionObj = null;
let dbObj = null;
let dbReadonlyUserObj = null;
let dbReadWriteUserObj = null;

function checkAndCreateDatabase() {
  return new Promise((resolve, reject) => {
    client.readDatabase(databaseUrl, (err, result) => {
      if (err) {
        if (err.code == '404') {
          client.createDatabase(dbconfig, (err, created) => {
            if (err) reject(err)
            else resolve(created);
          });
        } else {
          reject(err);
        }
      } else {
        resolve(result);
      }
    });
  });
}

function checkAndCreateCollection(collectionName, dbLink) {
  let collectionId = collectionName;

  return new Promise((resolve, reject) => {
    console.log(dbLink)
    var querySpec = {
      query: 'SELECT * FROM root r WHERE r.id=@id',
      parameters: [{
        name: '@id',
        value: collectionId
      }]
    };
    client.queryCollections(dbLink, querySpec).toArray(function (err, results) {
      if (err) {
        callback(err);

      } else {
        if (results.length === 0) {
          var collectionSpec = {
            id: collectionId
          };

          client.createCollection(dbLink, collectionSpec, function (err, created) {
            resolve(created);
          });

        } else {
          resolve(results[0]);
        }
      }
    });
  });
}

function checkAndCreateUser(dbLink, userId) {
  return new Promise((resolve, reject) => {
    var querySpec = {
      query: 'SELECT * FROM root r WHERE r.id=@id',
      parameters: [
        {
          name: '@id',
          value: userId
        }
      ]
    };

    client.queryUsers(dbLink, querySpec).toArray(function (err, results) {
      if (err) {
        handleError(err);
      } else if (results.length === 0) {

        client.createUser(dbLink, { id: userId }, (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });

        //collection found, return it
      } else {
        resolve(results[0]);
      }
    });


  });
}

//Initialize the server, checking and creating (if needed), our database, collections and users. 
checkAndCreateDatabase()
  .then((db) => {
    dbObj = db;
    console.log(`Completed DB Create`);
    checkAndCreateCollection('testCollection2', db._self)
      .then((coll) => {
        //We're all setup so lets start restify
        collectionObj = coll;

        //Create readonly users
        checkAndCreateUser(db._self, 'readonlyUser')
          .then((user) => {

            dbReadonlyUserObj = user;

            checkAndCreateUser(db._self, 'readWriteUser')
              .then((user) => {

                dbReadWriteUserObj = user;
                server.listen(8080, function () {
                  console.log('%s listening at %s', server.name, server.url);
                });
              })
              .catch((error) => {
                console.log(`User creation completed with error ${JSON.stringify(error)}`)
              });
          })
          .catch((error) => {
            console.log(`User creation completed with error ${JSON.stringify(error)}`)
          });


      })
      .catch((error) => {
        console.log(`Collection completed with error ${JSON.stringify(error)}`)
      });

  })
  .catch((error) => {
    console.log(`Database completed with error ${JSON.stringify(error)}`)
  });


var server = restify.createServer({
  name: 'myapp',
  version: '1.0.0'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.get('/cosmos/read', function (req, res, next) {
  // Takes in headers of 'resourceId', 'doclink' and 'token'
  // Then creates a limitedClient using the supplied token to read the data
  // from the document. 
  // The client cannot access other resources. 


  let resourceId = req.headers['resourceid'].toLowerCase();
  let limitedClient = new documentClient(process.env.COSMOS_ENDPOINT, {
    resourceTokens: { [resourceId]: req.headers['token'] }
  })

  limitedClient.readDocument(req.headers['doclink'], (error, result) => {
    if (error) {
      res.code = 500;
      res.send(error);
      return next();
    }
    else {
      res.send(result);
      return next();
    }
  });
});

server.get('/cosmos/create', function (req, res, next) {
  // Creates a new document using the master key 
  // Creates a token so other system can use this to access only this document
  // Returns the 'readToken', 'readWriteToken', 'resourceId' and 'docLink'
  // these can be passed to '/cosmos/create' to access the document using the token.  

  let document = {
    'id': uuid.v4(),
    'content': {
      'some': 'content'
    }
  }

  client.createDocument(collectionObj._self, document, (err, createdDoc) => {
    if (err) {
      res.code = 500;
      res.send(error);
      return next();
    }
    else {
      let readPermissions = {
        id: uuid.v4(),
        permissionMode: 'read',
        resource: createdDoc._self
      };

      let writePermissions = {
        id: uuid.v4(),
        permissionMode: 'all',
        resource: createdDoc._self
      };

      //Request readonly permissions
      client.createPermission(dbReadonlyUserObj._self, readPermissions, (error, createdReadonlyPermission) => {
        if (error) {
          res.code = 500;
          res.send(error);
          return next();
        }
        //Request readwrite permissions
        client.createPermission(dbReadWriteUserObj._self, writePermissions, (error, createdWritePermission) => {
          if (error) {
            res.code = 500;
            res.send(error);
            return next();
          }
          res.send({
            readToken: {
              id: createdReadonlyPermission._self,
              token: createdReadonlyPermission._token
            },
            readWriteToken: {
              id: createdWritePermission._self,
              token: createdWritePermission._token
            },
            docLink: createdDoc._self,
            resourceId: createdDoc._rid,
            documentCreated: document
          });
          return next();
        });
      });
    }
  });
});

//Oustanding Questions:
// - How does/can tokens be revoked? Was unable to get this to work. Once issues tokens seem to last for the lifetime of the resource. 
// - Get a better handle on the User -> Permission relationship. Could other services be
//    granted permisions to a user object and retreive all the tokens from that object,
//    then create a user per service, would this work well?

