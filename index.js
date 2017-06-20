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
let collectionName = 'testcollection';
let collectionUrl = `${databaseUrl}/${collectionName}`;
let collectionConfig = {
  id: collectionName
};

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

function checkAndCreateCollection(dbLink, collectionConfiguration) {
  let collectionId = collectionConfig.id;

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

          client.createCollection(databaseLink, collectionSpec, function (err, created) {
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

checkAndCreateDatabase()
  .then((db) => {
    dbObj = db;
    console.log(`Completed DB Create`);
    checkAndCreateCollection(db._self, collectionConfig)
      .then((coll) => {
        //We're all setup so lets start restify
        collectionObj = coll;

        //Create readonly user
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
            readToken: createdReadonlyPermission._token,
            readWriteToken: createdWritePermission._token,
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

