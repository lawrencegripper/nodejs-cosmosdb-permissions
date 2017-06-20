var restify = require('restify');
var documentClient = require("documentdb").DocumentClient;

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
  "id": collectionName
};
let userIdForInstance = 'bob';

let collectionObj = null;
let dbObj = null;
let dbUserObj = null;

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

        client.createUser(dbLink, {id : userId}, (error, results) => {
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

        checkAndCreateUser(db._self, userIdForInstance)
          .then((user) => {

            dbUserObj = user;
            server.listen(8080, function () {
              console.log('%s listening at %s', server.name, server.url);
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

server.get('/cosmostoken', function (req, res, next) {
  let document = {
    'id': req.params['id'],
    'content': req.params
  }

  client.createDocument(collectionObj._self, document, (err, created) => {
    if (err) {
      res.code = 500;
      res.send();
      return next();
    }
    else {
      let permissions = {
        'permissionMode': 'read',
        'resource': created._self
      };

      client.createPermission(dbUserObj._self, permissions, (error, resource) => {

        res.send(document);
        return next();
      });
    }
  });
});

